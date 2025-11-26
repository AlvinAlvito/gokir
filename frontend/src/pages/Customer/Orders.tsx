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
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

type OrderCardProps = { order: Order };
const OrderCard = ({ order }: OrderCardProps) => {
  const { noteText, proofsPickup, proofsDelivery } = parseNote(order.note);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">#{order.id.slice(0, 8)} • {new Date(order.createdAt).toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">{typeLabel(order.orderType)}</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{order.menuItem?.name || order.customStoreName || "Pesanan"}</p>
          {order.store?.storeProfile?.storeName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Toko: {order.store.storeProfile.storeName}</p>
          )}
          {order.customStoreAddress && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Alamat toko: {order.customStoreAddress}</p>
          )}
          {order.pickupAddress && <p className="text-sm text-gray-500 dark:text-gray-400">Pickup: {order.pickupAddress}</p>}
          {order.dropoffAddress && <p className="text-sm text-gray-500 dark:text-gray-400">Tujuan: {order.dropoffAddress}</p>}
          {order.quantity ? <p className="text-sm text-gray-800 dark:text-white/90">Qty: {order.quantity}</p> : null}
          <p className="text-sm text-gray-800 dark:text-white/90">Pembayaran: {order.paymentMethod === "QRIS" ? "QRIS" : "Cash"}</p>
          {noteText && <p className="text-xs text-gray-500 dark:text-gray-400">Catatan: {noteText}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge size="sm" color={badgeColor(order.status)}>{statusLabel(order.status)}</Badge>
          {order.menuItem ? (
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Rp{order.menuItem.promoPrice ?? order.menuItem.price}{order.quantity ? ` x ${order.quantity} = Rp${(order.menuItem.promoPrice ?? order.menuItem.price) * order.quantity}` : ""}
            </p>
          ) : null}
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
    </div>
  );
};
