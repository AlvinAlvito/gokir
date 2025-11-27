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
const stepItems: StepItem[] = [
  { key: "WAITING_STORE_CONFIRM", label: "Menunggu konfirmasi toko", desc: "Pesanan menunggu disetujui oleh toko." },
  { key: "CONFIRMED_COOKING", label: "Diproses toko", desc: "Pesanan kamu sedang dibuat oleh toko." },
  { key: "SEARCHING_DRIVER", label: "Mencari driver", desc: "Pesanan sudah selesai dibuat, sedang mencari driver." },
  { key: "DRIVER_ASSIGNED", label: "Driver ditemukan", desc: "Driver sudah ditemukan dan menjemput pesanan kamu." },
  { key: "ON_DELIVERY", label: "Sedang diantar", desc: "Pesanan sedang diantar ke lokasi tujuan kamu, pastikan alamat benar." },
  { key: "COMPLETED", label: "Selesai", desc: "Pesanan kamu sudah selesai diantarkan." },
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

export default function CustomerOrderProsesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("driver");
  const [reportDetail, setReportDetail] = useState("");
  const [reportProof, setReportProof] = useState<File | null>(null);
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrder = async () => {
    const endpoint = id ? `/customer/orders/${id}` : "/customer/orders/active";
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
  const currentStepIndex = useMemo(() => order ? stepItems.findIndex((s) => s.key === order.status) : -1, [order]);

  const stepDescOverride: Partial<Record<Status, string>> = {
    CONFIRMED_COOKING: "Pesanan kamu sedang dibuat oleh toko yaa",
    SEARCHING_DRIVER: "Pesanan kamu sudah selesai, dan sedang mencari driver untuk mengantar pesanan kamu.",
    DRIVER_ASSIGNED: "Driver sudah ditemukan dan sedang menjemput pesanan kamu",
    ON_DELIVERY: "Pesanan sedang diantar ke lokasi tujuan anda, pastikan alamat anda benar yaa",
    COMPLETED: "Pesanan kamu sudah selesai diantarkan",
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
      const r = await fetch(`${API_URL}/customer/orders/${order.id}/report`, {
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

  const cancelOrder = async () => {
    if (!order) return;
    try {
      setCancelLoading(true);
      const r = await fetch(`${API_URL}/customer/orders/${order.id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal membatalkan pesanan");
      setCancelOpen(false);
      navigate("/orders");
    } catch (e: any) {
      setError(e.message || "Gagal membatalkan pesanan");
    } finally {
      setCancelLoading(false);
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
          <Button size="sm" variant="outline" onClick={() => navigate("/orders")}>Lihat riwayat orderan</Button>
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
            {stepItems.map((s: StepItem, idx: number) => {
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

                  {s.key === "WAITING_STORE_CONFIRM" && (
                    <div className="space-y-3 text-gray-700 dark:text-white/90">
                      {order.store && (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">Detail Toko</p>
                          <p className="font-semibold text-gray-800 dark:text-white/90">{order.store.storeProfile?.storeName || "Toko"}</p>
                          <p className="text-xs text-gray-500">{order.store.storeProfile?.address || "Alamat tidak tersedia"}</p>
                        </div>
                      )}
                      {order.menuItem && (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">Detail Menu</p>
                          <p>{order.menuItem.name} x {order.quantity ?? 1}</p>
                          <p className="text-xs text-gray-500">Perkiraan: {currency((order.menuItem.promoPrice ?? order.menuItem.price ?? 0) * (order.quantity ?? 1))}</p>
                          <p className="text-xs text-gray-500">Catatan: {noteText || "-"}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {s.key === "DRIVER_ASSIGNED" && order.driver && (
                    <div className="space-y-2 text-gray-700 dark:text-white/90">
                      <p className="text-sm font-semibold">Detail Driver</p>
                      <div className="flex items-center gap-3">
                        <img src={toAbs(order.driver.driverProfile?.facePhotoUrl)} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-800" />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white/90">{order.driver.username || "Driver"}</p>
                          {order.driver.phone && (
                            <a className="text-xs text-brand-500 hover:underline" href={waLink(order.driver.phone) || "#"} target="_blank" rel="noreferrer">
                              {order.driver.phone}
                            </a>
                          )}
                          {order.driver.email && <p className="text-xs text-gray-500">{order.driver.email}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {s.key === "ON_DELIVERY" && (
                    <div className="space-y-2 text-gray-700 dark:text-white/90">
                      {order.dropoffAddress && (
                        <div>
                          <p className="text-sm font-semibold">Lokasi Pengantaran</p>
                          <p>{order.dropoffAddress}</p>
                        </div>
                      )}
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

                  {s.key === "COMPLETED" && proofsDelivery.length > 0 && (
                    <div className="space-y-1 text-gray-700 dark:text-white/90">
                      <p className="text-xs text-gray-500">Bukti penerimaan</p>
                      <div className="flex flex-wrap gap-3">
                        {proofsDelivery.map((p) => {
                          const src = toProof(p);
                          return src ? (
                            <a key={src} href={src} target="_blank" rel="noreferrer">
                              <img src={src} alt="Bukti penerimaan" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
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

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>Laporkan Transaksi</Button>
            {order.orderType === "FOOD_CUSTOM_STORE" && order.status === "SEARCHING_DRIVER" && (
              <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20">
                Batalkan pesanan
              </Button>
            )}
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

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} className="max-w-sm m-4">
        <div className="p-5 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59A2 2 0 0 1 16.518 17H3.482a2 2 0 0 1-1.742-3.311l6.517-11.59Z" clipRule="evenodd" />
              <path d="M11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M10 7v3" />
            </svg>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Batalkan pesanan?</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Pesanan custom ini masih mencari driver. Yakin ingin membatalkan?</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(false)}>Batal</Button>
            <Button size="sm" onClick={cancelOrder} disabled={cancelLoading} className="bg-red-500 hover:bg-red-600 text-white">
              {cancelLoading ? "Memproses..." : "Batalkan"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
