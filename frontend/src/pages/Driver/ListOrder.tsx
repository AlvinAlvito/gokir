import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
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

const statusBadge: Record<Status, "warning" | "error" | "primary" | "info" | "success" | "gray"> = {
  WAITING_STORE_CONFIRM: "warning",
  REJECTED: "error",
  CONFIRMED_COOKING: "primary",
  SEARCHING_DRIVER: "info",
  DRIVER_ASSIGNED: "success",
  ON_DELIVERY: "info",
  COMPLETED: "success",
  CANCELLED: "gray",
};

const typeLabel: Record<OrderType, string> = {
  FOOD_EXISTING_STORE: "Pesan makanan (toko terdaftar)",
  FOOD_CUSTOM_STORE: "Pesan makanan (toko luar)",
  RIDE: "Antar jemput",
};

const currency = (v?: number | null) => {
  if (v == null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v ?? 0);
};

const formatDate = (v: string) => new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

const toAbs = (rel?: string | null) => {
  if (!rel) return "/images/user/owner.jpg";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
};

export default function DriverListOrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [hasActive, setHasActive] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_URL}/driver/orders/available`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat orderan");
      setOrders(j.data.orders || []);
      setHasActive(j.data.hasActive || false);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const claim = async (id: string) => {
    try {
      setClaiming(id);
      const r = await fetch(`${API_URL}/driver/orders/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengambil orderan");
      navigate(`/driver/order-proses/${id}`);
    } catch (e: any) {
      setError(e.message || "Gagal mengambil orderan");
    } finally {
      setClaiming(null);
    }
  };

  const searchingOrders = useMemo(() => orders.filter(o => o.status === "SEARCHING_DRIVER"), [orders]);

  const renderCard = (o: Order) => {
    const total = (o.menuItem?.promoPrice ?? o.menuItem?.price ?? 0) * (o.quantity ?? 1);
    return (
      <div key={o.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(o.createdAt)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Tipe: {typeLabel[o.orderType]}</p>
            {o.paymentMethod && <p className="text-xs text-gray-500">Metode: {o.paymentMethod}</p>}
          </div>
          <Badge color={statusBadge[o.status]}>{statusLabel[o.status]}</Badge>
        </div>

        {o.store && (
          <div className="flex items-center gap-3">
            <img src={toAbs(o.store.storeProfile?.photoUrl)} alt="store" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-800" />
            <div>
              <p className="font-semibold text-gray-800 dark:text-white/90">{o.store.storeProfile?.storeName || "Toko"}</p>
              <p className="text-xs text-gray-500">{o.store.storeProfile?.address || "Alamat tidak tersedia"}</p>
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm text-gray-700 dark:text-white/90">
          {o.menuItem && (
            <div>
              <p className="font-semibold">Menu</p>
              <p>{o.menuItem.name} × {o.quantity ?? 1}</p>
              <p className="text-xs text-gray-500">Perkiraan: {currency(total)}</p>
            </div>
          )}

          {o.pickupAddress && (
            <div>
              <p className="font-semibold">Ambil di</p>
              <p>{o.pickupAddress}</p>
            </div>
          )}
          {o.dropoffAddress && (
            <div>
              <p className="font-semibold">Antar ke</p>
              <p>{o.dropoffAddress}</p>
            </div>
          )}

          {o.note && (
            <div>
              <p className="font-semibold">Catatan</p>
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{o.note}</p>
            </div>
          )}
        </div>

        {!hasActive && (
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => claim(o.id)}
              disabled={!!claiming}
            >
              {claiming === o.id ? "Memproses..." : "Ambil orderan"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageMeta title="List Order" description="Order yang mencari driver" />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Orderan Mencari Driver</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ditampilkan sesuai wilayah ketersediaan Anda.</p>
          {hasActive && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Anda sudah memiliki order aktif. Selesaikan dahulu sebelum mengambil order lain.</p>}
        </div>

        {error && <div className="text-sm text-amber-600 dark:text-amber-400">{error}</div>}
        {loading ? (
          <p className="text-sm text-gray-600">Memuat...</p>
        ) : searchingOrders.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada orderan di wilayah Anda.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {searchingOrders.map(renderCard)}
          </div>
        )}
      </div>
    </>
  );
}
