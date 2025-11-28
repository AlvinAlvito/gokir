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
      const bangMatch = url.match(/!3d([0-9.+-]+)!4d([0-9.+-]+)/i);
      if (bangMatch) return { lat: Number(bangMatch[1]), lng: Number(bangMatch[2]) };
    } catch {
      return null;
    }
    return null;
  };

  // jika sudah mengandung latlng, langsung kembalikan
  const direct = parseLatLng(rawUrl);
  if (direct) return res.json({ ok: true, data: direct });

  const tryResolve = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const resp = await fetch(rawUrl, { method: "GET", redirect: "follow" as any });
      const finalUrl = resp.url || rawUrl;
      const fromUrl = parseLatLng(finalUrl);
      if (fromUrl) return fromUrl;
      const html = await resp.text();
      const atMatch = html.match(/@([0-9.+-]+),([0-9.+-]+)/i);
      if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
      const bangMatch = html.match(/!3d([0-9.+-]+)!4d([0-9.+-]+)/i);
      if (bangMatch) return { lat: Number(bangMatch[1]), lng: Number(bangMatch[2]) };
      const centerMatch = html.match(/\"center\"\\s*:\\s*\\{\\s*\"lat\"\\s*:\\s*([0-9.+-]+)\\s*,\\s*\"lng\"\\s*:\\s*([0-9.+-]+)\\s*\\}/i);
      if (centerMatch) return { lat: Number(centerMatch[1]), lng: Number(centerMatch[2]) };
      return null;
    } catch {
      return null;
    }
  };

  const resolved = await tryResolve();
  if (!resolved) {
    return res.status(400).json({ ok: false, error: { message: "Tidak bisa membaca koordinat dari URL" } });
  }
  return res.json({ ok: true, data: resolved });
});

export default router;
