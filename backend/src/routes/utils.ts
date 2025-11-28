import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const parseLatLng = (url: string): { lat: number; lng: number } | null => {
  try {
    const qMatch = url.match(/q=([0-9.+-]+),([0-9.+-]+)/i);
    if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
    const atMatch = url.match(/@([0-9.+-]+),([0-9.+-]+)/i);
    if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
    const bangMatch = url.match(/!3d([0-9.+-]+)!4d([0-9.+-]+)/i);
    if (bangMatch) return { lat: Number(bangMatch[1]), lng: Number(bangMatch[2]) };
  } catch {
    return null;
  }
  return null;
};

// GET /utils/resolve-map?url=...
router.get("/resolve-map", async (req: any, res) => {
  const rawUrl = String(req.query.url || "");
  if (!rawUrl) return res.status(400).json({ ok: false, error: { message: "url wajib diisi" } });

  const direct = parseLatLng(rawUrl);
  if (direct) return res.json({ ok: true, data: direct });

  const ua = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" };

  const tryResolve = async (): Promise<{ lat: number; lng: number } | null> => {
    // 1) HEAD follow
    try {
      const headFollow = await fetch(rawUrl, { method: "HEAD", redirect: "follow" as any, headers: ua });
      const parsedHead = parseLatLng(headFollow.url || rawUrl);
      if (parsedHead) return parsedHead;
    } catch { /* ignore */ }

    // 2) HEAD manual (Location)
    try {
      const headManual = await fetch(rawUrl, { method: "HEAD", redirect: "manual" as any, headers: ua });
      const loc = headManual.headers.get("location");
      if (loc) {
        const locParsed = parseLatLng(loc);
        if (locParsed) return locParsed;
      }
    } catch { /* ignore */ }

    // 3) GET follow and parse HTML (take last match)
    try {
      const resp = await fetch(rawUrl, { method: "GET", redirect: "follow" as any, headers: ua });
      const finalUrl = resp.url || rawUrl;
      const parsedFinal = parseLatLng(finalUrl);
      if (parsedFinal) return parsedFinal;
      const html = await resp.text();
      const bangAll = [...html.matchAll(/!3d([0-9.+-]+)!4d([0-9.+-]+)/gi)];
      if (bangAll.length > 0) {
        const last = bangAll[bangAll.length - 1];
        return { lat: Number(last[1]), lng: Number(last[2]) };
      }
      const atAll = [...html.matchAll(/@([0-9.+-]+),([0-9.+-]+)/gi)];
      if (atAll.length > 0) {
        const last = atAll[atAll.length - 1];
        return { lat: Number(last[1]), lng: Number(last[2]) };
      }
      const centerAll = [...html.matchAll(/"center"\s*:\s*\{\s*"lat"\s*:\s*([0-9.+-]+)\s*,\s*"lng"\s*:\s*([0-9.+-]+)\s*\}/gi)];
      if (centerAll.length > 0) {
        const last = centerAll[centerAll.length - 1];
        return { lat: Number(last[1]), lng: Number(last[2]) };
      }
    } catch { /* ignore */ }

    return null;
  };

  const resolved = await tryResolve();
  if (!resolved) {
    return res.status(400).json({ ok: false, error: { message: "Tidak bisa membaca koordinat dari URL" } });
  }
  return res.json({ ok: true, data: resolved });
});

export default router;
