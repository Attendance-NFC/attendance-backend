import type { Request, Response, NextFunction } from "express";

// Double-submit cookie check. A forged cross-site request can make the
// browser SEND the refreshToken cookie automatically, but it can't READ
// the (non-httpOnly) csrfToken cookie to also attach the matching header —
// cookies are only readable by JS running on their own origin. A mismatch
// or missing header means this request didn't actually come from our
// frontend, even though it carried a valid session cookie.
export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.csrfToken as string | undefined;
  const headerToken = req.headers["x-csrf-token"] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "Invalid or missing CSRF token" });
  }

  next();
}

