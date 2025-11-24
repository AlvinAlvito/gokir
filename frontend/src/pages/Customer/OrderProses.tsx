import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";

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

const stepItems: { key: Status; label: string; desc: string }[] = [
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

const parseNote = (note?: string | null) => {
  const proofsPickup: string[] = [];
  const proofsDelivery: string[] = [];
  let cleaned = note || "";
  if (note) {
    const pickupR = /PickupProof:\s*(\S+)/gi;
    const deliveryR = /DeliveryProof:\s*(\S+)/gi;
    let m;
    while ((m = pickupR.exec(note))) proofsPickup.push(m[1]);
    while ((m = deliveryR.exec(note))) proofsDelivery.push(m[1]);
    cleaned = cleaned.replace(/(PickupProof|DeliveryProof):\s*\S+/gi, "");
    cleaned = cleaned.replace(/https?:\/\/\S+/gi, "");
    cleaned = cleaned.trim();
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

  return (
    <>
      <PageMeta title="Order Aktif" description="Detail order yang sedang diproses" />
      {error && <div className="text-sm text-amber-600 dark:text-amber-400">{error}</div>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && !order && (
        <p className="text-sm text-gray-500">
          {error ? "" : "Order tidak ditemukan atau belum ada order aktif."}
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

          <div className="space-y-3">
            {stepItems.map((s, idx) => {
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
                            {proofsPickup.map((p) => (
                              <a key={p} href={toAbs(p)} target="_blank" rel="noreferrer">
                                <img src={toAbs(p)} alt="Bukti pengambilan" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {s.key === "COMPLETED" && proofsDelivery.length > 0 && (
                    <div className="space-y-1 text-gray-700 dark:text-white/90">
                      <p className="text-xs text-gray-500">Bukti penerimaan</p>
                      <div className="flex flex-wrap gap-3">
                        {proofsDelivery.map((p) => (
                          <a key={p} href={toAbs(p)} target="_blank" rel="noreferrer">
                            <img src={toAbs(p)} alt="Bukti penerimaan" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => navigate(-1)}>Kembali</Button>
          </div>
        </div>
      )}
    </>
  );
}
