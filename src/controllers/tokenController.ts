import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

const REFRESH_TOKENS_TABLE = process.env.REFRESH_TOKENS_TABLE ?? "refresh_tokens_table";
const USERS_TABLE = process.env.USERS_TABLE ?? "users_table";
const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000;

export type AuthenticatedUser = {
  user_id: string;
  role: string;
  name: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

// ---- Access token ----
// Short-lived JWT, verified purely by signature on every request — no DB
// lookup needed. This is what gets sent as Authorization: Bearer <token>.
export function generateAccessToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { sub: user.user_id, role: user.role, name: user.name },
    JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

// ---- Refresh token ----
// A long, random opaque string (not a signed JWT) — its validity is
// determined by whether a matching record still exists in RefreshTokens,
// not by a signature. This is what makes per-session logout possible:
// deleting the DB record immediately invalidates this exact token.
export async function generateRefreshToken(userId: string): Promise<string> {
  const tokenId = randomBytes(40).toString("hex");
  const now = Math.floor(Date.now() / 1000);

  await docClient.send(
    new PutCommand({
      TableName: REFRESH_TOKENS_TABLE,
      Item: {
        token_id: tokenId,
        user_id: userId,
        created_at: now,
        expires_at: now + REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      },
    })
  );

  return tokenId;
}

// ---- Middleware: verifies the access token on protected routes ----
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as {
      sub: string;
      role: string;
      name: string;
    };
    req.user = { user_id: payload.sub, role: payload.role, name: payload.name };
    next();
  } catch {
    // Covers both an invalid signature and an expired access token.
    // An expired access token is the expected, routine case — the frontend
    // should catch this 401 and call /refresh to get a new one, not treat
    // it as a hard logout.
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Use after authenticateToken to restrict a route to specific roles,
// e.g. router.post("/users", authenticateToken, requireRole("admin"), handler)
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// ---- POST /refresh ----
// Reads the refresh token from the httpOnly cookie, confirms it still
// exists (hasn't been logged out or expired) in RefreshTokens, and issues
// a brand new access token. This is what the frontend should call
// automatically whenever a request comes back 401 due to an expired
// access token — it should feel invisible to the person using the app.
export async function refresh(req: Request, res: Response) {
  try {
    const tokenId = req.cookies?.refreshToken as string | undefined;

    if (!tokenId) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const tokenResult = await docClient.send(
      new GetCommand({
        TableName: REFRESH_TOKENS_TABLE,
        Key: { token_id: tokenId },
      })
    );

    const tokenRecord = tokenResult.Item as
      | { token_id: string; user_id: string; expires_at: number }
      | undefined;

    const now = Math.floor(Date.now() / 1000);

    if (!tokenRecord || tokenRecord.expires_at < now) {
      // Either never existed (bad/forged cookie), was deleted by a logout,
      // or has genuinely expired — all three get the same response and a
      // cleared cookie, so the frontend knows to send the person to /login.
      res.clearCookie("refreshToken");
      return res.status(401).json({ error: "Refresh token is invalid or expired" });
    }

    // Look up the user fresh, rather than trusting anything cached — if
    // their role changed or their account was deactivated since they last
    // logged in, that needs to be reflected in the new access token.
    const userResult = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { user_id: tokenRecord.user_id },
      })
    );
    const user = userResult.Item as
      | { user_id: string; name: string; role: string; status: string }
      | undefined;

    if (!user || user.status !== "Active") {
      return res.status(403).json({ error: "This account is not active" });
    }

    const accessToken = generateAccessToken({
      user_id: user.user_id,
      role: user.role,
      name: user.name,
    });

    return res.json({ accessToken });
  } catch (err) {
    console.error("refresh failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ---- POST /logout ----
// Deletes only this one session's refresh token record — per-session
// logout, not logout-everywhere. Other devices/sessions are unaffected.
export async function logout(req: Request, res: Response) {
  try {
    const tokenId = req.cookies?.refreshToken as string | undefined;

    if (tokenId) {
      await docClient.send(
        new DeleteCommand({
          TableName: REFRESH_TOKENS_TABLE,
          Key: { token_id: tokenId },
        })
      );
    }

    res.clearCookie("refreshToken");
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("logout failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}