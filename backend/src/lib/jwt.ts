import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export type SessionPayload = {
  userId: string;
  role: "CUSTOMER" | "STORE" | "DRIVER" | "ADMIN" | "SUPERADMIN";
};

export function signSession(payload: SessionPayload, maxAgeSec = 7 * 24 * 3600) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: maxAgeSec });
}

export function verifySessionToken(token?: string): SessionPayload | null {
  try {
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
