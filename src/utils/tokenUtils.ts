import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

const REFRESH_TOKENS_TABLE = process.env.REFRESH_TOKENS_TABLE ?? "refresh_tokens_table";

export type AuthenticatedUser = {
  user_id: string;
  role: string;
  name: string;
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