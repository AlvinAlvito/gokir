import { useEffect, useState } from "react";
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
  store?: {
    id: string;
    storeProfile?: { storeName?: string | null; photoUrl?: string | null; address?: string | null } | null;
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
  DRIVER_ASSIGNED: "Driver ditemukan",
  ON_DELIVERY: "Sedang diantar",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const statusBadge: Record<Status, "warning" | "error" | "primary" | "info" | "success" | "gray"> = {
  WAITING_STORE_CONFIRM: "warning",
  REJECTED: "error",
  CONFIRMED_COOKING: "primary",
  SEARCHING_DRIVER: "info",
  DRIVER_ASSIGNED: "info",
  ON_DELIVERY: "success",
  COMPLETED: "success",
  CANCELLED: "gray",
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

  const mapLink = order?.note?.match(/https?:\/\/\S+/)?.[0] || null;
  const noteText = order?.note?.replace(/Maps?:\s*https?:\/\/\S+/i, "").trim() || "";

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
                <p>{order.menuItem.name} × {order.quantity ?? 1}</p>
                <p className="text-xs text-gray-500">Perkiraan: {currency((order.menuItem.promoPrice ?? order.menuItem.price ?? 0) * (order.quantity ?? 1))}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Detail Customer (Anda)</p>
              <p>{order.customer?.username || "Tanpa nama"}</p>
              {order.customer?.phone && <p className="text-xs text-gray-500">{order.customer.phone}</p>}
              {order.customer?.email && <p className="text-xs text-gray-500">{order.customer.email}</p>}
            </div>

            {order.driver && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Detail Driver</p>
                <div className="flex items-center gap-3">
                  <img src={toAbs(order.driver.driverProfile?.facePhotoUrl)} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-800" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">{order.driver.username || "Driver"}</p>
                    {order.driver.phone && (
                      <a className="text-xs text-brand-500 hover:underline" href={waLink(order.driver.phone) || "#"} target="_blank" rel="noreferrer">
                        Chat WhatsApp
                      </a>
                    )}
                    {order.driver.email && <p className="text-xs text-gray-500">{order.driver.email}</p>}
                  </div>
                </div>
              </div>
            )}

            {order.pickupAddress && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Lokasi Pickup</p>
                <p>{order.pickupAddress}</p>
              </div>
            )}
            {order.dropoffAddress && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Lokasi Pengantaran</p>
                <p>{order.dropoffAddress}</p>
              </div>
            )}

            {order.note && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Catatan</p>
                {noteText && <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{noteText}</p>}
                {mapLink && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={mapLink} target="_blank" rel="noreferrer">Buka lokasi di Google Maps</a>
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => navigate(-1)}>Kembali</Button>
          </div>
        </div>
      )}
    </>
  );
}
