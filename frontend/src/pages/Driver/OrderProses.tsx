import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";

const API_URL = import.meta.env.VITE_API_URL as string;

type Status =
  | "WAITING_STORE_CONFIRM"
  | "REJECTED"
  | "CONFIRMED_COOKING"
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "ON_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

type OrderType = "FOOD_EXISTING_STORE" | "FOOD_CUSTOM_STORE" | "RIDE";

type Order = {
  id: string;
  status: Status;
  orderType: OrderType;
  paymentMethod?: string | null;
  quantity?: number | null;
  note?: string | null;
  createdAt: string;
  customer?: { id: string; username?: string | null; email?: string | null; phone?: string | null } | null;
  driver?: { id: string; username?: string | null; email?: string | null; phone?: string | null; driverProfile?: { facePhotoUrl?: string | null } | null } | null;
  store?: { id: string; storeProfile?: { storeName?: string | null; photoUrl?: string | null; address?: string | null } | null } | null;
  menuItem?: { id: string; name: string; price?: number | null; promoPrice?: number | null } | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
};

const statusLabel: Record<Status, string> = {
  WAITING_STORE_CONFIRM: "Menunggu konfirmasi toko",
  REJECTED: "Ditolak",
  CONFIRMED_COOKING: "Diproses toko",
  SEARCHING_DRIVER: "Mencari driver",
  DRIVER_ASSIGNED: "Driver ditemukan",
  ON_DELIVERY: "Sedang diantar",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const statusBadge: Record<Status, "warning" | "error" | "primary" | "info" | "success"> = {
  WAITING_STORE_CONFIRM: "warning",
  REJECTED: "error",
  CONFIRMED_COOKING: "primary",
  SEARCHING_DRIVER: "info",
  DRIVER_ASSIGNED: "info",
  ON_DELIVERY: "success",
  COMPLETED: "success",
  CANCELLED: "error",
};

const typeLabel: Record<OrderType, string> = {
  FOOD_EXISTING_STORE: "Pesan makanan (toko terdaftar)",
  FOOD_CUSTOM_STORE: "Pesan makanan (toko luar)",
  RIDE: "Antar jemput",
};

type StepItem = { key: Status; label: string; desc: string };
const stepItemsFood: StepItem[] = [
  { key: "WAITING_STORE_CONFIRM", label: "Menunggu konfirmasi toko", desc: "Pesanan menunggu disetujui oleh toko." },
  { key: "CONFIRMED_COOKING", label: "Diproses toko", desc: "Pesanan kamu sedang dibuat oleh toko yaa" },
  { key: "SEARCHING_DRIVER", label: "Mencari driver", desc: "Pesanan kamu sudah selesai, dan sedang mencari driver untuk mengantar pesanan kamu." },
  { key: "DRIVER_ASSIGNED", label: "Driver ditemukan", desc: "Driver sudah ditemukan dan sedang menjemput pesanan kamu" },
  { key: "ON_DELIVERY", label: "Sedang diantar", desc: "Pesanan sedang diantar ke lokasi tujuan anda, pastikan alamat anda benar yaa" },
  { key: "COMPLETED", label: "Selesai", desc: "Pesanan kamu sudah selesai diantarkan" },
];

const stepItemsRide: StepItem[] = [
  { key: "SEARCHING_DRIVER", label: "Mencari driver", desc: "Sedang mencari driver untuk perjalananmu." },
  { key: "DRIVER_ASSIGNED", label: "Driver ditemukan", desc: "Driver sudah ditemukan dan sedang menjemput kamu" },
  { key: "ON_DELIVERY", label: "Sedang diantar", desc: "Perjalanan sedang berlangsung, pastikan tujuan benar yaa" },
  { key: "COMPLETED", label: "Selesai", desc: "Perjalanan selesai" },
];

const currency = (v?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v ?? 0);
const formatDate = (v: string) => new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
const toAbs = (rel?: string | null) => {
  if (!rel) return "/images/user/owner.jpg";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
};
const toProof = (path?: string | null) => {
  if (!path) return null;
  const cleaned = path.trim();
  if (!cleaned) return null;
  const build = () => {
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    if (cleaned.startsWith("/")) return `${API_URL}${cleaned}`;
    if (cleaned.includes("order-proofs/")) return `${API_URL}/${cleaned}`;
    return `${API_URL}/uploads/order-proofs/${cleaned}`;
  };
  const url = build();
  return url.replace(/ /g, "%20");
};

const extractMap = (note?: string | null) => {
  if (!note) return null;
  const m = note.match(/Maps:\s*(https?:\S+)/i);
  return m ? m[1] : null;
};

const parseRideMeta = (note?: string | null) => {
  const pickupMap = note?.match(/Maps:\s*(https?:\S+)/i)?.[1] || null;
  const dropoffMap = note?.match(/DropoffMap:\s*(https?:\S+)/i)?.[1] || null;
  const pickupPhoto = note?.match(/PickupPhoto:\s*([^\s\n]+)/i)?.[1] || null;
  const est = note?.match(/Estimasi harga:\s*([^\n]+)/i)?.[1] || null;
  return { pickupMap, dropoffMap, pickupPhoto, estPrice: est };
};

const parseNote = (note?: string | null) => {
  const proofsPickup: string[] = [];
  const proofsDelivery: string[] = [];
  let cleaned = note || "";
  if (note) {
    const pickupR = /PickupProof:\s*([^\n,;]+)/gi;
    const deliveryR = /DeliveryProof:\s*([^\n,;]+)/gi;
    let m;
    while ((m = pickupR.exec(note))) {
      const target = m[1]?.trim().replace(/,+$/, "");
      if (target) proofsPickup.push(target);
    }
    while ((m = deliveryR.exec(note))) {
      const target = m[1]?.trim().replace(/,+$/, "");
      if (target) proofsDelivery.push(target);
    }
    cleaned = cleaned.replace(/PickupProof:[^\n]*/gi, "").replace(/DeliveryProof:[^\n]*/gi, "").trim();
  }
  return { noteText: cleaned, proofsPickup, proofsDelivery };
};

const waLink = (phone?: string | null) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("62") ? digits : `62${digits.replace(/^0/, "")}`;
  return `https://wa.me/${normalized}`;
};

export default function DriverOrderProsesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("driver");
  const [reportDetail, setReportDetail] = useState("");
  const [reportProof, setReportProof] = useState<File | null>(null);
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const fetchOrder = async () => {
    const endpoint = id ? `/driver/orders/${id}` : "/driver/orders/active";
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_URL}${endpoint}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat order");
      setOrder(j.data.order || null);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const { noteText, proofsPickup, proofsDelivery } = parseNote(order?.note);
  const mapUrl = extractMap(order?.note);
  const steps = order?.orderType === "RIDE" ? stepItemsRide : stepItemsFood;
  const currentStepIndex = useMemo(() => order ? steps.findIndex((s) => s.key === order.status) : -1, [order, steps]);
  const rideMeta = order?.orderType === "RIDE" ? parseRideMeta(order.note) : null;

  const stepDescOverride: Partial<Record<Status, string>> = {
    CONFIRMED_COOKING: "Pesanan kamu sedang dibuat oleh toko yaa",
    SEARCHING_DRIVER: "Pesanan kamu sudah selesai, dan sedang mencari driver untuk mengantar pesanan kamu.",
    DRIVER_ASSIGNED: "Driver sudah ditemukan dan sedang menjemput pesanan kamu",
    ON_DELIVERY: "Pesanan sedang diantar ke lokasi tujuan anda, pastikan alamat anda benar yaa",
    COMPLETED: "Pesanan kamu sudah selesai diantarkan",
  };

  const needsPickupProof = order?.status === "DRIVER_ASSIGNED";
  const needsDeliveryProof = order?.status === "ON_DELIVERY";

  const handlePickup = async () => {
    if (!order?.id) return;
    if (!proof) {
      setError("Unggah bukti pengambilan terlebih dahulu.");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append("proof", proof);
      const r = await fetch(`${API_URL}/driver/orders/${order.id}/pickup`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengunggah bukti");
      setProof(null);
      fetchOrder();
    } catch (e: any) {
      setError(e.message || "Gagal mengunggah bukti");
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!order?.id) return;
    if (!proof) {
      setError("Unggah bukti serah terima terlebih dahulu.");
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append("proof", proof);
      const r = await fetch(`${API_URL}/driver/orders/${order.id}/complete`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengunggah bukti");
      setProof(null);
      navigate("/driver/orders");
    } catch (e: any) {
      setError(e.message || "Gagal menyelesaikan order");
    } finally {
      setUploading(false);
    }
  };

  const submitReport = async () => {
    if (!order?.id) return;
    if (!reportDetail.trim()) {
      setReportError("Detail permasalahan wajib diisi.");
      return;
    }
    try {
      setReportSending(true);
      setReportError(null);
      const fd = new FormData();
      fd.append("category", reportCategory);
      fd.append("detail", reportDetail.trim());
      if (reportProof) fd.append("proof", reportProof);
      const r = await fetch(`${API_URL}/driver/orders/${order.id}/report`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengirim laporan");
      setReportSending(false);
      setReportOpen(false);
      setReportSuccess(true);
      setReportDetail("");
      setReportProof(null);
    } catch (e: any) {
      setReportSending(false);
      setReportError(e.message || "Gagal mengirim laporan");
    }
  };

  return (
    <>
      <PageMeta title="Order Aktif" description="Detail order yang sedang diproses" />
      {error && <div className="text-sm text-amber-600 dark:text-amber-400">{error}</div>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && !order && (
        <div className="text-sm text-gray-500 space-y-2">
          <p>{error ? "" : "Order tidak ditemukan atau belum ada order aktif."}</p>
          <Button size="sm" variant="outline" onClick={() => navigate("/driver/orders")}>Lihat riwayat orderan</Button>
        </div>
      )}
      {order && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
              <p className="text-sm text-gray-700 dark:text-white/90">{typeLabel[order.orderType]}</p>
              {order.paymentMethod && <p className="text-xs text-gray-500">Metode: {order.paymentMethod}</p>}
            </div>
            <Badge color={statusBadge[order.status]}>{statusLabel[order.status]}</Badge>
          </div>

          <div className="space-y-3">
            {steps.map((s: StepItem, idx: number) => {
              const active = currentStepIndex >= idx && currentStepIndex !== -1;
              const desc = stepDescOverride[s.key] || s.desc;

              return (
                <div
                  key={s.key}
                  className={`rounded-xl border p-4 text-sm space-y-2 ${active ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-gray-200 dark:border-gray-800"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-semibold ${active ? "text-emerald-700 dark:text-emerald-300" : "text-gray-800 dark:text-white/90"}`}>{s.label}</p>
                      <p className="text-xs text-gray-500 whitespace-pre-line">{desc}</p>
                    </div>
                  </div>

                  {s.key === "DRIVER_ASSIGNED" && order.customer && (
                    <div className="space-y-2 text-gray-700 dark:text-white/90">
                      <p className="text-sm font-semibold">Detail Customer</p>
                      <div className="text-xs">
                        <p>{order.customer.username || "Customer"}</p>
                        {order.customer.phone && <p className="text-gray-500">{order.customer.phone}</p>}
                        {order.customer.email && <p className="text-gray-500">{order.customer.email}</p>}
                      </div>
                    </div>
                  )}

                  {s.key === "DRIVER_ASSIGNED" && order.store && (
                    <div className="space-y-2 text-gray-700 dark:text-white/90">
                      <p className="text-sm font-semibold">Detail Toko</p>
                      <div className="flex items-center gap-3">
                        <img src={toAbs(order.store.storeProfile?.photoUrl)} className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-800" />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white/90">{order.store.storeProfile?.storeName || "Toko"}</p>
                          <p className="text-xs text-gray-500">{order.store.storeProfile?.address || "Alamat tidak tersedia"}</p>
                          {mapUrl && (
                            <a href={mapUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Buka lokasi (Maps)</a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {s.key === "ON_DELIVERY" && order.dropoffAddress && (
                    <div className="space-y-2 text-gray-700 dark:text-white/90">
                      {order.orderType === "RIDE" ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Titik lokasi penjemputan</p>
                          <p className="text-xs text-gray-500">Wilayah penjemputan</p>
                          <p className="text-sm">{order.pickupRegion || "-"}</p>
                          <p className="text-xs text-gray-500">Alamat lengkap penjemputan</p>
                          <p className="text-sm">{order.pickupAddress || "-"}</p>
                          {rideMeta?.pickupMap && (
                            <a href={rideMeta.pickupMap} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Buka lokasi penjemputan (Maps)</a>
                          )}
                          {rideMeta?.pickupPhoto && (
                            <a
                              href={rideMeta.pickupPhoto.startsWith("http") ? rideMeta.pickupPhoto : `${API_URL}${rideMeta.pickupPhoto.startsWith("/") ? "" : "/"}${rideMeta.pickupPhoto}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-brand-600 hover:underline block"
                            >
                              Lihat foto pickup
                            </a>
                          )}

                          <p className="text-sm font-semibold mt-3">Titik lokasi tujuan</p>
                          <p className="text-xs text-gray-500">Wilayah tujuan</p>
                          <p className="text-sm">{order.dropoffRegion || "-"}</p>
                          <p className="text-xs text-gray-500">Alamat lengkap tujuan</p>
                          <p className="text-sm">{order.dropoffAddress || "-"}</p>
                          {rideMeta?.dropoffMap && (
                            <a href={rideMeta.dropoffMap} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Buka lokasi tujuan (Maps)</a>
                          )}
                          {rideMeta?.estPrice && (
                            <p className="text-sm font-semibold mt-2">Estimasi harga: {rideMeta.estPrice}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold">Lokasi Pengantaran</p>
                          <p>{order.dropoffAddress}</p>
                          {mapUrl && (
                            <a href={mapUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Buka lokasi (Maps)</a>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {s.key === "WAITING_STORE_CONFIRM" && order.store && (
                    <div className="space-y-2 text-gray-700 dark:text-white/90">
                      <p className="text-sm font-semibold">Detail Toko</p>
                      <p className="font-semibold text-gray-800 dark:text-white/90">{order.store.storeProfile?.storeName || "Toko"}</p>
                      <p className="text-xs text-gray-500">{order.store.storeProfile?.address || "Alamat tidak tersedia"}</p>
                    </div>
                  )}

                  {s.key === "WAITING_STORE_CONFIRM" && order.menuItem && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Detail Menu</p>
                      <p>{order.menuItem.name} x {order.quantity ?? 1}</p>
                      <p className="text-xs text-gray-500">Perkiraan: {currency((order.menuItem.promoPrice ?? order.menuItem.price ?? 0) * (order.quantity ?? 1))}</p>
                      <p className="text-xs text-gray-500">Catatan: {noteText || "-"}</p>
                      {mapUrl && (
                        <a href={mapUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Buka lokasi (Maps)</a>
                      )}
                    </div>
                  )}

                  {s.key === "ON_DELIVERY" && proofsPickup.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Bukti pengambilan</p>
                      <div className="flex flex-wrap gap-3">
                        {proofsPickup.map((p) => {
                          const src = toProof(p);
                          return src ? (
                            <a key={src} href={src} target="_blank" rel="noreferrer">
                              <img src={src} alt="Bukti pengambilan" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
                            </a>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {s.key === "COMPLETED" && proofsDelivery.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Bukti serah terima</p>
                      <div className="flex flex-wrap gap-3">
                        {proofsDelivery.map((p) => {
                          const src = toProof(p);
                          return src ? (
                            <a key={src} href={src} target="_blank" rel="noreferrer">
                              <img src={src} alt="Bukti serah terima" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
                            </a>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Upload bukti</p>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
              onChange={(e: any) => setProof(e.target.files?.[0] || null)}
              className="text-sm text-gray-600 dark:text-gray-300"
            />
            {proof && <p className="text-xs text-gray-500">File: {proof.name}</p>}
          </div>

          <div className="flex items-center gap-3">
            {order.status === "DRIVER_ASSIGNED" && (
              <Button size="sm" onClick={handlePickup} disabled={uploading || !proof}>
                {uploading ? "Memproses..." : "Kirim bukti pickup"}
              </Button>
            )}
            {order.status === "ON_DELIVERY" && (
              <Button size="sm" onClick={handleComplete} disabled={uploading || !proof}>
                {uploading ? "Memproses..." : "Kirim bukti serah terima"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>Laporkan Transaksi</Button>
          </div>
        </div>
      )}

      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)} className="max-w-lg m-4">
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Laporkan Transaksi</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-white/80">Masalah pada transaksi</label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="driver">Masalah pada driver</option>
                <option value="customer">Masalah pada customer</option>
                <option value="store">Masalah pada toko</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-white/80">Detail permasalahan</label>
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="Contoh: driver membawa lari makanan saya dan tidak diantar."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-white/80">Upload foto bukti pendukung</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                onChange={(e: any) => {
                  const file = e.target.files?.[0] || null;
                  setReportProof(file);
                }}
                className="block w-full text-sm text-gray-700 dark:text-gray-300"
              />
              {reportProof && <p className="text-xs text-gray-500 dark:text-gray-400">File: {reportProof.name}</p>}
            </div>
            {reportError && <p className="text-xs text-amber-600 dark:text-amber-400">{reportError}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>Batal</Button>
              <Button
                size="sm"
                onClick={submitReport}
                disabled={reportSending}
              >
                {reportSending ? "Mengirim..." : "Kirim"}
              </Button>
            </div>
            <a
              href="https://wa.me/6281260303320"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.04]"
            >
              Hubungi customer service
            </a>
          </div>
        </div>
      </Modal>
      <Modal isOpen={reportSuccess} onClose={() => setReportSuccess(false)} className="max-w-sm m-4">
        <div className="p-5 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.42l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Laporan diterima</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Laporan anda kami terima, kami akan mereview laporan anda dan akan segera menghubungi anda melalui WhatsApp anda.
            </p>
          </div>
          <div className="flex justify-center">
            <Button size="sm" onClick={() => setReportSuccess(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
