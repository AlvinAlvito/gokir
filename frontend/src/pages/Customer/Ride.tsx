import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { Modal } from "../../components/ui/modal";

const API_URL = import.meta.env.VITE_API_URL as string;

const regionOptions = [
  { label: "Kampus UINSU Sutomo", value: "KAMPUS_SUTOMO" },
  { label: "Kampus UINSU Pancing", value: "KAMPUS_PANCING" },
  { label: "Kampus UINSU Tuntungan", value: "KAMPUS_TUNTUNGAN" },
  { label: "Wilayah Lainnya (muncul di semua wilayah)", value: "WILAYAH_LAINNYA" },
];

type RideForm = {
  pickupRegion: string;
  pickupAddress: string;
  pickupMap: string;
  pickupPhoto: File | null;
  dropoffRegion: string;
  dropoffAddress: string;
  dropoffMap: string;
  price: number;
};

export default function RideOrderPage() {
  const [form, setForm] = useState<RideForm>({
    pickupRegion: "",
    pickupAddress: "",
    pickupMap: "",
    pickupPhoto: null,
    dropoffRegion: "",
    dropoffAddress: "",
    dropoffMap: "",
    price: 6000,
  });
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const parseLatLngLocal = (url: string): { lat: number; lng: number } | null => {
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

  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const resolveLatLng = async (url: string) => {
    const local = parseLatLngLocal(url);
    if (local) return local;
    try {
      const r = await fetch(`${API_URL}/utils/resolve-map?url=${encodeURIComponent(url)}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) return null;
      if (j.data?.lat && j.data?.lng) return { lat: j.data.lat, lng: j.data.lng };
    } catch {
      return null;
    }
    return null;
  };

  const recomputeFare = async (pickupMap: string, dropoffMap: string) => {
    const [p, d] = await Promise.all([resolveLatLng(pickupMap), resolveLatLng(dropoffMap)]);
    if (!p || !d) {
      setDistanceKm(null);
      return false;
    }
    const straight = haversineKm(p, d);
    const distance = straight * 1.3; // faktor koreksi jalan
    const baseFare = 4000;
    const perKm = 2000;
    const est = Math.max(baseFare, Math.round(baseFare + distance * perKm));
    setDistanceKm(Number(distance.toFixed(2)));
    setForm((prev) => ({ ...prev, price: est }));
    return true;
  };

  const handleEstimate = async () => {
    if (!form.pickupMap || !form.dropoffMap) {
      setError("Isi link Maps penjemputan dan tujuan dulu, lalu tekan cek estimasi.");
      return;
    }
    const ok = await recomputeFare(form.pickupMap, form.dropoffMap);
    if (ok) {
      setShowEstimate(true);
      setError(null);
    } else {
      setShowEstimate(false);
      setError("Link Maps tidak valid, pastikan ada koordinat lat,lng di URL.");
    }
  };

  const handleSubmit = async () => {
    if (!form.pickupRegion || !form.dropoffRegion || !form.pickupAddress || !form.dropoffAddress) {
      setError("Lengkapi wilayah dan alamat penjemputan/tujuan");
      return;
    }
    if (!showEstimate) {
      setError("Silakan cek estimasi harga dulu.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const fd = new FormData();
      fd.append("orderType", "RIDE");
      fd.append("pickupRegion", form.pickupRegion);
      fd.append("dropoffRegion", form.dropoffRegion);
      fd.append("pickupAddress", form.pickupAddress);
      fd.append("dropoffAddress", form.dropoffAddress);
      if (form.pickupMap) fd.append("pickupMap", form.pickupMap);
      if (form.dropoffMap) fd.append("dropoffMap", form.dropoffMap);
      fd.append("paymentMethod", "CASH");
      fd.append("quantity", "1");
      fd.append("note", `Estimasi harga: Rp${form.price}`);
      if (form.pickupPhoto) fd.append("pickupPhoto", form.pickupPhoto);

      const r = await fetch(`${API_URL}/customer/orders`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal membuat order ride");
      setMsg("Order berhasil dibuat. Mencari driver...");
      setSuccessOpen(true);
    } catch (e: any) {
      setError(e.message || "Gagal membuat order ride");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title="Anterin Dong" description="Pesan antar penumpang" />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Anterin dong</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Isi detail penjemputan dan tujuanmu, kami cari driver terdekat.</p>
        </div>

        {msg && <div className="text-sm text-emerald-600 dark:text-emerald-400">{msg}</div>}
        {error && <div className="text-sm text-amber-600 dark:text-amber-400">{error}</div>}

        <div className="space-y-6 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="space-y-3">
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Titik lokasi penjemputan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700 dark:text-white/80">Wilayah penjemputan</label>
                <Select
                  options={regionOptions}
                  defaultValue={form.pickupRegion}
                  onChange={(v: string) => setForm((p) => ({ ...p, pickupRegion: v }))}
                  placeholder="Pilih wilayah"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 dark:text-white/80">Alamat lengkap penjemputan</label>
                <Input value={form.pickupAddress} onChange={(e: any) => setForm((p) => ({ ...p, pickupAddress: e.target.value }))} placeholder="Jl..." />
              </div>
              <div>
                <label className="text-sm text-gray-700 dark:text-white/80">Link Maps lokasi penjemputan</label>
                <Input
                  value={form.pickupMap}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setForm((p) => ({ ...p, pickupMap: val }));
                    setShowEstimate(false);
                    setDistanceKm(null);
                  }}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 dark:text-white/80">Upload foto sekitar lokasi penjemputan</label>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/*" onChange={(e: any) => setForm((p) => ({ ...p, pickupPhoto: e.target.files?.[0] || null }))} className="text-sm text-gray-600 dark:text-gray-300" />
                {form.pickupPhoto && <p className="text-xs text-gray-500">File: {form.pickupPhoto.name}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Titik lokasi tujuan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700 dark:text-white/80">Wilayah tujuan</label>
                <Select
                  options={regionOptions}
                  defaultValue={form.dropoffRegion}
                  onChange={(v: string) => setForm((p) => ({ ...p, dropoffRegion: v }))}
                  placeholder="Pilih wilayah"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 dark:text-white/80">Alamat lengkap tujuan</label>
                <Input value={form.dropoffAddress} onChange={(e: any) => setForm((p) => ({ ...p, dropoffAddress: e.target.value }))} placeholder="Jl..." />
              </div>
              <div>
                <label className="text-sm text-gray-700 dark:text-white/80">Link Maps lokasi tujuan</label>
                <Input
                  value={form.dropoffMap}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setForm((p) => ({ ...p, dropoffMap: val }));
                    setShowEstimate(false);
                    setDistanceKm(null);
                  }}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button size="sm" variant="outline" onClick={handleEstimate} disabled={submitting}>
              Cek estimasi harga
            </Button>
            <label className="text-sm text-gray-700 dark:text-white/80">Estimasi harga</label>
            {showEstimate ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 px-3 py-2">
                <p className="text-sm text-gray-800 dark:text-white/90">Rp {form.price.toLocaleString("id-ID")}</p>
                {distanceKm !== null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Perkiraan jarak: {distanceKm} km (garis lurus x1.3)</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">Isi link Maps, lalu tekan cek estimasi untuk melihat estimasi harga.</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Memproses..." : "Mulai cari driver"}
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={successOpen} onClose={() => setSuccessOpen(false)} className="max-w-sm m-4">
        <div className="p-5 space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.42l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Sedang mencari driver</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Kami sedang mencari driver terdekat. Pantau di halaman order aktif.</p>
          <div className="flex justify-center">
            <Button size="sm" onClick={() => { setSuccessOpen(false); window.location.href = "/orders/active"; }}>Lihat order aktif</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
