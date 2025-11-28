import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

// GET /utils/resolve-map?url=...
router.get("/resolve-map", async (req: any, res) => {
  const rawUrl = String(req.query.url || "");
  if (!rawUrl) return res.status(400).json({ ok: false, error: { message: "url wajib diisi" } });

  const parseLatLng = (url: string): { lat: number; lng: number } | null => {
    try {
      const qMatch = url.match(/q=([0-9.+-]+),([0-9.+-]+)/i);
      if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
      const atMatch = url.match(/@([0-9.+-]+),([0-9.+-]+)/i);
      if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
    } catch {
      return null;
    }
    return null;
  };

  // jika sudah mengandung latlng, langsung kembalikan
  const direct = parseLatLng(rawUrl);
  if (direct) return res.json({ ok: true, data: direct });

  try {
    const resp = await fetch(rawUrl, { method: "HEAD", redirect: "follow" as any });
    const finalUrl = resp.url || rawUrl;
    const parsed = parseLatLng(finalUrl);
    if (!parsed) {
      return res.status(400).json({ ok: false, error: { message: "Tidak bisa membaca koordinat dari URL" } });
    }
    return res.json({ ok: true, data: parsed });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: { message: e.message || "Gagal resolve URL" } });
  }
});

export default router;
