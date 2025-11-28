import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import OneIsToOne from "../../components/video/OneIsToOne";

type Item = {
  whatsappLink?: string | null;
  youtubeUrl?: string | null;
  tips?: string | null;
  warning?: string | null;
  terms?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL as string;

export default function CustomerTutorialSupportPage() {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/tutorial-support`, { credentials: "include" });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat data");
        setItem(j.data?.item || null);
      } catch (e: any) {
        setError(e.message || "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <PageMeta title="Tutorial & Support" description="Bantuan penggunaan aplikasi" />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tutorial & Support</h2>
          <p className="text-sm text-gray-500">Kumpulan bantuan, video, dan link support.</p>
        </div>
        {loading && <p className="text-sm text-gray-500">Memuat...</p>}
        {error && <p className="text-sm text-amber-600">{error}</p>}
        {!loading && item && (
          <div className="space-y-4">
            {item.youtubeUrl && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-sm font-semibold mb-2">Video tutorial</p>
                <OneIsToOne embedUrl={item.youtubeUrl} />
              </div>
            )}
            {item.whatsappLink && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Grup WhatsApp</p>
                <a className="text-brand-500 break-all text-sm" href={item.whatsappLink} target="_blank" rel="noreferrer">{item.whatsappLink}</a>
              </div>
            )}
            {item.tips && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-sm font-semibold">Tips & trik</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{item.tips}</p>
              </div>
            )}
            {item.warning && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-3">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Peringatan</p>
                <p className="text-sm text-amber-700 dark:text-amber-200 whitespace-pre-line">{item.warning}</p>
              </div>
            )}
            {item.terms && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-sm font-semibold">Syarat & ketentuan</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{item.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
