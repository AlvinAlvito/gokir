import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";

const API_URL = import.meta.env.VITE_API_URL as string;

type Pricing = {
  under1Km: number;
  km1To1_5: number;
  km1_5To2: number;
  km2To2_5: number;
  km2_5To3: number;
  above3PerKm: number;
};

export default function DeliveryPricingPage() {
  const [pricing, setPricing] = useState<Pricing>({
    under1Km: 0,
    km1To1_5: 0,
    km1_5To2: 0,
    km2To2_5: 0,
    km2_5To3: 0,
    above3PerKm: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_URL}/superadmin/pricing`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat harga ongkir");
      setPricing(j.data.pricing);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPricing(); }, []);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setMsg(null);
      const r = await fetch(`${API_URL}/superadmin/pricing`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal menyimpan harga");
      setMsg("Harga ongkir berhasil disimpan");
      setPricing(j.data.pricing);
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan harga");
    } finally {
      setSaving(false);
    }
  };

  const handle = (field: keyof Pricing, value: number) => {
    setPricing((p) => ({ ...p, [field]: value }));
  };

  return (
    <>
      <PageMeta title="Harga Ongkir" description="Atur estimasi ongkir per km" />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Harga Ongkir</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Atur estimasi yang dipakai untuk customer.</p>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Memuat...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-white/80">Di bawah 1 km</label>
              <Input type="number" value={pricing.under1Km} onChange={(e: any) => handle("under1Km", Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-white/80">1 - 1.5 km</label>
              <Input type="number" value={pricing.km1To1_5} onChange={(e: any) => handle("km1To1_5", Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-white/80">1.5 - 2 km</label>
              <Input type="number" value={pricing.km1_5To2} onChange={(e: any) => handle("km1_5To2", Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-white/80">2 - 2.5 km</label>
              <Input type="number" value={pricing.km2To2_5} onChange={(e: any) => handle("km2To2_5", Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-white/80">2.5 - 3 km</label>
              <Input type="number" value={pricing.km2_5To3} onChange={(e: any) => handle("km2_5To3", Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-white/80">Per km di atas 3 km</label>
              <Input type="number" value={pricing.above3PerKm} onChange={(e: any) => handle("above3PerKm", Number(e.target.value) || 0)} />
            </div>
          </div>
        )}
        {error && <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>}
        {msg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{msg}</p>}
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving || loading}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </div>
    </>
  );
}
