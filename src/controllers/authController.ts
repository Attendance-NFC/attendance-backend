import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import type { Request, Response } from "express";
import { QueryCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db.js";
import { generateAccessToken, generateRefreshToken } from "../utils/tokenUtils.js";

const USERS_TABLE = process.env.USERS_TABLE ?? "users_table";
const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days, matches tokenController's refresh token expiry
const REFRESH_TOKENS_TABLE = process.env.REFRESH_TOKENS_TABLE ?? "refresh_tokens_table";


type UserRecord = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  password_hash: string;
};

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanedEmail = email.trim().toLowerCase();

    // Look up the user by email via the EmailIndex GSI — Users is keyed by
    // user_id on the base table, so this can't be a direct GetItem.
    const result = await docClient.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: "email_index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": cleanedEmail },
      })
    );

    const user = result.Items?.[0] as UserRecord | undefined;

    // Same generic error for "no such user" and "wrong password" — don't
    // let a client tell the two apart.
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status !== "Active") {
      return res.status(403).json({ error: "This account is not active" });
    }

    const authenticatedUser = { user_id: user.user_id, role: user.role, name: user.name };

    const accessToken = generateAccessToken(authenticatedUser);
    const refreshToken = await generateRefreshToken(user.user_id);

    // httpOnly: JavaScript can't read this cookie at all, even via an XSS
    // bug — only the browser sends it automatically on requests to this API.
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // requires HTTPS in prod; allows plain HTTP in local dev
      sameSite: 'none',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    });

    // Deliberately NOT httpOnly — the frontend needs to read this value
    // in JS and attach it as a header on /refresh and /logout. Its
    // security doesn't depend on secrecy from the browser's own JS, only
    // on the fact that a different origin's JS can't read it at all.
    const csrfToken = randomBytes(32).toString("hex");
    res.cookie("csrfToken", csrfToken, {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    });

    return res.json({
      accessToken,
      user: { id: user.user_id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
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
          TableName: 'refresh_tokens_table',
          Key: { token_id: tokenId },
        })
      );
    }

    res.clearCookie("refreshToken");
    res.clearCookie("csrfToken");
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("logout failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
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
