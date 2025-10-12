import { Response, Request } from "express";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "gokir_jwt"; // ← samakan dengan yang kamu set saat login
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

type JwtPayload = {
  sub: string; // id user
  role: "CUSTOMER" | "STORE" | "DRIVER" | "ADMIN" | "SUPERADMIN";
  iat?: number;
  exp?: number;
};

export type SessionPayload = {
  userId: string;
  role: JwtPayload["role"];
};

export function issueSession(res: Response, sess: SessionPayload) {
  // kalau kamu sudah punya mekanisme sign sendiri, boleh abaikan function ini
  const token = jwt.sign({ sub: sess.userId, role: sess.role }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true kalau HTTPS
    path: "/",
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function readSession(req: Request): SessionPayload | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
