import { Router } from "express";
import { readSession, clearSession } from "@/lib/session";

const router = Router();

function noCache(res: any) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
}

router.get("/session", (req, res) => {
  noCache(res);
  const sess = readSession(req);
  if (!sess) {
    return res.json({ ok: true, data: { user: null } });
  }
  // FE mengharapkan { ok:true, data:{ user:{ id, role } } }
  return res.json({ ok: true, data: { user: { id: sess.userId, role: sess.role } } });
});

router.post("/logout", (_req, res) => {
  noCache(res);
  clearSession(res);
  return res.json({ ok: true, data: {} });
});

export default router;
