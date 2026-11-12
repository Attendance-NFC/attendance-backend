import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db.js";
import { generateAccessToken, generateRefreshToken } from "./tokenController.js";

const USERS_TABLE = process.env.USERS_TABLE ?? "users_table";

const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days, matches tokenController's refresh token expiry

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

    return res.json({
      accessToken,
      user: { id: user.user_id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
}