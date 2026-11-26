import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

// ---- Middleware: verifies the access token on protected routes ----
export type AuthenticatedUser = {
  user_id: string;
  role: string;
  name: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

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