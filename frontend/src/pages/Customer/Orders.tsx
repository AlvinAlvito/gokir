import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";

const API_URL = import.meta.env.VITE_API_URL as string;

type OrderStatus =
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
  status: OrderStatus;
  paymentMethod: "CASH" | "QRIS";
  quantity?: number | null;
  note?: string | null;
  createdAt: string;
  orderType: OrderType;
  customStoreName?: string | null;
  customStoreAddress?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  menuItem?: { id: string; name: string; price: number; promoPrice?: number | null } | null;
  store?: { id: string; storeProfile?: { id: string; storeName?: string | null } | null } | null;
};

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/customer/orders`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat order");
      setOrders(j.data.orders || []);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const badgeColor = (status: OrderStatus) => {
    if (["CONFIRMED_COOKING", "DRIVER_ASSIGNED", "ON_DELIVERY", "COMPLETED"].includes(status)) return "success";
    if (["REJECTED", "CANCELLED"].includes(status)) return "error";
    return "warning";
  };

  const statusLabel = (status: OrderStatus) => {
    switch (status) {
      case "WAITING_STORE_CONFIRM": return "Menunggu konfirmasi toko";
      case "REJECTED": return "Orderan ditolak";
      case "CONFIRMED_COOKING": return "Dikonfirmasi, sedang dibuat";
      case "SEARCHING_DRIVER": return "Sedang mencari driver";
      case "DRIVER_ASSIGNED": return "Driver ditemukan";
      case "ON_DELIVERY": return "Sedang diantarkan";
      case "COMPLETED": return "Selesai";
      case "CANCELLED": return "Dibatalkan";
      default: return status;
    }
  };

  const typeLabel = (type: OrderType) => {
    if (type === "FOOD_EXISTING_STORE") return "Pesan makanan (toko sistem)";
    if (type === "FOOD_CUSTOM_STORE") return "Pesan makanan (toko luar)";
    return "Antar jemput";
  };

  return (
    <>
      <PageMeta title="Orderan Kamu" description="Daftar order makanan/transportasi" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Orderan Kamu</h2>
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
              <div key={o.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">#{o.id.slice(0, 8)} • {new Date(o.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{typeLabel(o.orderType)}</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{o.menuItem?.name || o.customStoreName || "Pesanan"}</p>
                    {o.store?.storeProfile?.storeName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Toko: {o.store.storeProfile.storeName}</p>
                    )}
                    {o.customStoreAddress && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Alamat toko: {o.customStoreAddress}</p>
                    )}
                    {o.pickupAddress && <p className="text-sm text-gray-500 dark:text-gray-400">Pickup: {o.pickupAddress}</p>}
                    {o.dropoffAddress && <p className="text-sm text-gray-500 dark:text-gray-400">Tujuan: {o.dropoffAddress}</p>}
                    {o.quantity ? <p className="text-sm text-gray-800 dark:text-white/90">Qty: {o.quantity}</p> : null}
                    <p className="text-sm text-gray-800 dark:text-white/90">Pembayaran: {o.paymentMethod === "QRIS" ? "QRIS" : "Cash"}</p>
                    {o.note && <p className="text-xs text-gray-500 dark:text-gray-400">Catatan: {o.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge size="sm" color={badgeColor(o.status)}>{statusLabel(o.status)}</Badge>
                    {o.menuItem ? (
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        Rp{o.menuItem.promoPrice ?? o.menuItem.price}{o.quantity ? ` x ${o.quantity} = Rp${(o.menuItem.promoPrice ?? o.menuItem.price) * o.quantity}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
