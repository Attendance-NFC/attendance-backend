import type { Response } from "express";
import type { AuthenticatedRequest } from "./tokenController.js";
import { fetchUserProfile } from "./fetchUserProfile.js";

export async function getMyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      // Shouldn't happen if authenticateToken ran first, but guard anyway.
      return res.status(401).json({ error: "Not authenticated" });
    }

    const profile = await fetchUserProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(profile);
  } catch (err) {
    console.error("getMyProfile failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
