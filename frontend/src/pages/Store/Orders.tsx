import { useEffect, useMemo, useState } from "react";
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
  menuItem?: { id: string; name: string; price?: number | null; promoPrice?: number | null } | null;
  customStoreName?: string | null;
  customStoreAddress?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
};

const statusLabel: Record<Status, string> = {
  WAITING_STORE_CONFIRM: "Menunggu konfirmasi toko",
  REJECTED: "Ditolak",
  CONFIRMED_COOKING: "Dikonfirmasi, sedang diproses",
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
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);
};

const formatDate = (v: string) => new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_URL}/store/orders`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat pesanan");
      setOrders(j.data.orders || []);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const waitingOrders = useMemo(() => orders.filter(o => o.status === "WAITING_STORE_CONFIRM"), [orders]);
  const otherOrders = useMemo(() => orders.filter(o => o.status !== "WAITING_STORE_CONFIRM"), [orders]);

  const updateStatus = async (id: string, status: Status) => {
    try {
      setUpdatingId(id);
      const r = await fetch(`${API_URL}/store/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengubah status");
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch (e: any) {
      setError(e.message || "Gagal memperbarui status");
    } finally {
      setUpdatingId(null);
    }
  };

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

        <div className="space-y-2 text-sm text-gray-700 dark:text-white/90">
          <div>
            <p className="font-semibold">Pelanggan</p>
            <p>{o.customer?.username || "Tanpa nama"}</p>
            <p className="text-xs text-gray-500">{o.customer?.email || "-"}</p>
          </div>

          {o.menuItem && (
            <div>
              <p className="font-semibold">Menu</p>
              <p>{o.menuItem.name} × {o.quantity ?? 1}</p>
              <p className="text-xs text-gray-500">Total: {currency(total)}</p>
            </div>
          )}

          {o.customStoreName && (
            <div>
              <p className="font-semibold">Pesanan toko luar sistem</p>
              <p>{o.customStoreName}</p>
              <p className="text-xs text-gray-500">{o.customStoreAddress || "Alamat tidak ada"}</p>
            </div>
          )}

          {o.pickupAddress && (
            <div>
              <p className="font-semibold">Jemput</p>
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

        {o.status === "WAITING_STORE_CONFIRM" && (
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, "REJECTED")} disabled={!!updatingId}>
              Tolak
            </Button>
            <Button size="sm" onClick={() => updateStatus(o.id, "CONFIRMED_COOKING")} disabled={!!updatingId}>
              Terima & proses
            </Button>
          </div>
        )}

        {o.status === "CONFIRMED_COOKING" && (
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => updateStatus(o.id, "SEARCHING_DRIVER")}
              disabled={!!updatingId}
            >
              Selesai (cari driver)
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Pesanan Toko" description="Kelola pesanan yang masuk" />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pesanan Masuk</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Konfirmasi pesanan baru atau lihat riwayat pesanan.</p>
        </div>

        {error && <div className="text-sm text-amber-600 dark:text-amber-400">{error}</div>}
        {loading ? (
          <p className="text-sm text-gray-600">Memuat...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada pesanan.</p>
        ) : (
          <div className="space-y-6">
            {waitingOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Menunggu konfirmasi</h3>
                  <Badge color="warning">{waitingOrders.length}</Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {waitingOrders.map(renderCard)}
                </div>
              </div>
            )}

            {otherOrders.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Pesanan lain</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {otherOrders.map(renderCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
