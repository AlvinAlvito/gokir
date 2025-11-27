import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
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
  store?: {
    id: string;
    storeProfile?: { storeName?: string | null; photoUrl?: string | null; address?: string | null } | null;
  } | null;
  menuItem?: { id: string; name: string; price?: number | null; promoPrice?: number | null } | null;
  pickupRegion?: string | null;
  dropoffRegion?: string | null;
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

const parseRideMeta = (note?: string | null) => {
  const pickupMap = note?.match(/Maps:\s*(https?:\S+)/i)?.[1] || null;
  const dropoffMap = note?.match(/DropoffMap:\s*(https?:\S+)/i)?.[1] || null;
  const pickupPhoto = note?.match(/PickupPhoto:\s*([^\s\n]+)/i)?.[1] || null;
  const est = note?.match(/Estimasi harga:\s*([^\n]+)/i)?.[1] || null;
  const cleaned = (note || "")
    .replace(/Maps:\s*https?:\S+/gi, "")
    .replace(/DropoffMap:\s*https?:\S+/gi, "")
    .replace(/PickupPhoto:\s*\S+/gi, "")
    .replace(/PickupProof:\s*\S+/gi, "")
    .replace(/DeliveryProof:\s*\S+/gi, "")
    .trim();
  return { pickupMap, dropoffMap, pickupPhoto, estPrice: est, cleanedNote: cleaned };
};

const parseNote = (note?: string | null) => {
  const proofsPickup: string[] = [];
  const proofsDelivery: string[] = [];
  let mapUrl: string | null = null;
  let cleaned = note || "";
  if (note) {
    const pickupR = /PickupProof:\s*([^\n,;]+)/gi;
    const deliveryR = /DeliveryProof:\s*([^\n,;]+)/gi;
    const mapR = /Maps:\s*(https?:\S+)/i;
    const mapM = note.match(mapR);
    if (mapM) mapUrl = mapM[1];
    let m;
    while ((m = pickupR.exec(note))) {
      const target = m[1]?.trim().replace(/,+$/, "");
      if (target) proofsPickup.push(target);
    }
    while ((m = deliveryR.exec(note))) {
      const target = m[1]?.trim().replace(/,+$/, "");
      if (target) proofsDelivery.push(target);
    }
    cleaned = cleaned
      .replace(/PickupProof:[^\n]*/gi, "")
      .replace(/DeliveryProof:[^\n]*/gi, "")
      .replace(/Maps:\s*https?:\S+/gi, "")
      .trim();
  }
  return { noteText: cleaned, proofsPickup, proofsDelivery, mapUrl };
};

export default function DriverOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 3;
  const [hasNext, setHasNext] = useState(false);

  const fetchOrders = async (pageToFetch = 1) => {
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/driver/orders/history?page=${pageToFetch}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat order");
      const data = j.data || {};
      const fetched = data.orders || [];
      setOrders(fetched);
      setPage(data.page || pageToFetch);
      setHasNext(fetched.length === perPage);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(page); }, []);

  return (
    <>
      <PageMeta title="Riwayat Transaksi" description="Daftar order yang sudah kamu kerjakan" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Riwayat Transaksi</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Order terbaru ada di paling atas.</p>
          </div>
          <button
            onClick={fetchOrders}
            className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
          >
            Refresh
          </button>
        </div>
        {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
        {loading ? (
          <p className="text-sm text-gray-500">Memuat...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada order.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => fetchOrders(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
              >
                Sebelumnya
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">Halaman {page}</p>
              <button
                onClick={() => fetchOrders(page + 1)}
                disabled={!hasNext || loading}
                className="text-sm rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.04]"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

type OrderCardProps = { order: Order };
const OrderCard = ({ order }: OrderCardProps) => {
  const navigate = useNavigate();
  const rideMeta = order.orderType === "RIDE" ? parseRideMeta(order.note) : null;
  const parsed = parseNote(order.note);
  const displayNote = rideMeta ? rideMeta.cleanedNote : parsed.noteText;
  const proofsPickup = parsed.proofsPickup;
  const proofsDelivery = parsed.proofsDelivery;
  const mapUrl = rideMeta ? null : parsed.mapUrl;
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("driver");
  const [reportDetail, setReportDetail] = useState("");
  const [reportProof, setReportProof] = useState<File | null>(null);
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">#{order.id.slice(0, 8)}  \u0007 {new Date(order.createdAt).toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">{typeLabel[order.orderType]}</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{order.menuItem?.name || order.customStoreName || "Pesanan"}</p>
          {order.store?.storeProfile?.storeName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Toko: {order.store.storeProfile.storeName}</p>
          )}
          {order.pickupAddress && <p className="text-sm text-gray-500 dark:text-gray-400">Pickup: {order.pickupAddress}</p>}
          {order.dropoffAddress && <p className="text-sm text-gray-500 dark:text-gray-400">Tujuan: {order.dropoffAddress}</p>}
          {order.quantity ? <p className="text-sm text-gray-800 dark:text-white/90">Qty: {order.quantity}</p> : null}
          <p className="text-sm text-gray-800 dark:text-white/90">Pembayaran: {order.paymentMethod === "QRIS" ? "QRIS" : "Cash"}</p>
          <div className="space-y-1">
            {rideMeta?.estPrice && <p className="text-xs text-gray-500 dark:text-gray-400">Estimasi harga: {rideMeta.estPrice}</p>}
            {rideMeta && (
              <div className="flex flex-wrap gap-2">
                {rideMeta.pickupMap && (
                  <a
                    href={rideMeta.pickupMap}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200"
                  >
                    Lihat Maps pickup
                  </a>
                )}
                {rideMeta.dropoffMap && (
                  <a
                    href={rideMeta.dropoffMap}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200"
                  >
                    Lihat Maps tujuan
                  </a>
                )}
                {rideMeta.pickupPhoto && (
                  <a
                    href={rideMeta.pickupPhoto.startsWith("http") ? rideMeta.pickupPhoto : `${API_URL}${rideMeta.pickupPhoto.startsWith("/") ? "" : "/"}${rideMeta.pickupPhoto}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white/80"
                  >
                    Lihat foto pickup
                  </a>
                )}
              </div>
            )}
            {!rideMeta && mapUrl && (
              <div className="flex flex-wrap gap-2">
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200"
                >
                  Lihat Maps
                </a>
              </div>
            )}
            {displayNote && <p className="text-xs text-gray-500 dark:text-gray-400">Catatan: {displayNote}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge size="sm" color={statusBadge[order.status]}>{statusLabel[order.status]}</Badge>
          {order.menuItem ? (
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Rp{order.menuItem.promoPrice ?? order.menuItem.price}{order.quantity ? ` x ${order.quantity} = Rp${(order.menuItem.promoPrice ?? order.menuItem.price) * order.quantity}` : ""}
            </p>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => navigate(`/driver/order-proses/${order.id}`)}>Lihat detail</Button>
        </div>
      </div>

      {(proofsPickup.length > 0 || proofsDelivery.length > 0) && (
        <div className="mt-3 space-y-2">
          {proofsPickup.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Bukti pengambilan</p>
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
          {proofsDelivery.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Bukti serah terima</p>
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
      )}

      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>Laporkan Transaksi</Button>
      </div>

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
              <Button size="sm" onClick={submitReport} disabled={reportSending}>
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
    </div>
  );
};
