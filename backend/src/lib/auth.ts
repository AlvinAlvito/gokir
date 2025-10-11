import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma.js";
import type { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function issueSession(res: Response, userId: string, role: Role) {
  const token = signToken({ sub: userId, role });
  // HttpOnly cookie (alternatif: kirim ke FE sebagai body)
  res.cookie("gokir_jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false // set true jika HTTPS
  });
  return token;
}

export interface AuthedUser {
  id: string;
  role: Role;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const cookie = (req as any).cookies?.["gokir_jwt"];
  const token = header?.startsWith("Bearer ") ? header.slice(7) : cookie;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).user = { id: decoded.sub, role: decoded.role } as AuthedUser;
    } catch {}
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) return res.status(401).json({ ok: false, error: { message: "Unauthorized" }});
  next();
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user as AuthedUser | undefined;
    if (!u) return res.status(401).json({ ok: false, error: { message: "Unauthorized" }});
    if (!roles.includes(u.role)) return res.status(403).json({ ok: false, error: { message: "Forbidden" }});
    next();
  };
}

export async function logAudit(userId: string | null, action: string, req: Request) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    }
  });
}
