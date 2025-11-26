import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
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
  store?: {
    id: string;
    storeProfile?: { storeName?: string | null; photoUrl?: string | null; address?: string | null } | null;
    storeAvailability?: { region?: string | null } | null;
  } | null;
  menuItem?: { id: string; name: string; price?: number | null; promoPrice?: number | null } | null;
  customStoreName?: string | null;
  customStoreAddress?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
};

const statusLabel: Record<Status, string> = {
  WAITING_STORE_CONFIRM: "Menunggu konfirmasi toko",
  REJECTED: "Ditolak",
  CONFIRMED_COOKING: "Diproses toko",
  SEARCHING_DRIVER: "Mencari driver",
  DRIVER_ASSIGNED: "Sudah diambil",
  ON_DELIVERY: "Sedang diantar",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const statusBadge: Record<Status, "warning" | "error" | "primary" | "info" | "success"> = {
  WAITING_STORE_CONFIRM: "warning",
  REJECTED: "error",
  CONFIRMED_COOKING: "primary",
  SEARCHING_DRIVER: "info",
  DRIVER_ASSIGNED: "success",
  ON_DELIVERY: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

const typeLabel: Record<OrderType, string> = {
  FOOD_EXISTING_STORE: "Pesan makanan (toko terdaftar)",
  FOOD_CUSTOM_STORE: "Pesan makanan (toko luar)",
  RIDE: "Antar jemput",
};

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
  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const submitPickupProof = async () => {
    if (!order?.id || !proof) {
      setError("Bukti pengambilan wajib diupload.");
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
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengirim bukti");
      setOrder(j.data.order || order);
      setProof(null);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setUploading(false);
    }
  };

  const submitDeliveryProof = async () => {
    if (!order?.id || !proof) {
      setError("Bukti serah terima wajib diupload.");
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
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal menyelesaikan order");
      setOrder(j.data.order || order);
      setProof(null);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
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
      <PageMeta title="Order Proses" description="Detail order yang sedang Anda tangani" />
      {error && <div className="text-sm text-amber-600 dark:text-amber-400">{error}</div>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && !order && (
        <p className="text-sm text-gray-500">
          {error ? "" : "Order tidak ditemukan atau tidak ada order aktif."}
        </p>
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

          {order.store && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Detail Toko</p>
              <div className="flex items-center gap-3">
                <img src={toAbs(order.store.storeProfile?.photoUrl)} className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-800" />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{order.store.storeProfile?.storeName || "Toko"}</p>
                  <p className="text-xs text-gray-500">{order.store.storeProfile?.address || "Alamat tidak tersedia"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm text-gray-700 dark:text-white/90">
            {order.menuItem && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Detail Menu</p>
                <p>{order.menuItem.name} x {order.quantity ?? 1}</p>
                <p className="text-xs text-gray-500">Perkiraan: {currency((order.menuItem.promoPrice ?? order.menuItem.price ?? 0) * (order.quantity ?? 1))}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Detail Customer</p>
              <p>{order.customer?.username || "Tanpa nama"}</p>
              {order.customer?.phone && (
                <a className="text-xs text-brand-500 hover:underline" href={waLink(order.customer.phone) || "#"} target="_blank" rel="noreferrer">
                  Chat WhatsApp
                </a>
              )}
              {order.customer?.email && <p className="text-xs text-gray-500">{order.customer.email}</p>}
            </div>

            {order.pickupAddress && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Detail Pickup</p>
                <p>{order.pickupAddress}</p>
              </div>
            )}
            {order.dropoffAddress && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Detail Drop-off</p>
                <p>{order.dropoffAddress}</p>
                {proofsPickup.length > 0 && (
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
          </div>
            )}

            {noteText && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Catatan</p>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{noteText}</p>
              </div>
            )}

            {proofsDelivery.length > 0 && (
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

          {order.status === "DRIVER_ASSIGNED" && (
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Bukti pengambilan</p>
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                onChange={(e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return setProof(null);
                  if (!file.type.startsWith("image/")) {
                    setError("Hanya file gambar (jpg, jpeg, png, webp, gif) yang diizinkan.");
                    setProof(null);
                    return;
                  }
                  setError(null);
                  setProof(file);
                }}
              />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={submitPickupProof} disabled={uploading || !proof}>
                  {uploading ? "Mengirim..." : "Kirim & antar pesanan"}
                </Button>
              </div>
            </div>
          )}

          {order.status === "ON_DELIVERY" && (
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Bukti serah terima</p>
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                onChange={(e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return setProof(null);
                  if (!file.type.startsWith("image/")) {
                    setError("Hanya file gambar (jpg, jpeg, png, webp, gif) yang diizinkan.");
                    setProof(null);
                    return;
                  }
                  setError(null);
                  setProof(file);
                }}
              />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={submitDeliveryProof} disabled={uploading || !proof}>
                  {uploading ? "Mengirim..." : "Selesaikan order"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
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
                placeholder="Contoh: customer tidak merespon, transaksi tidak dapat diselesaikan."
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
