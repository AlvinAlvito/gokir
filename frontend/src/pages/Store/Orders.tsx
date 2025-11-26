import { useEffect, useMemo, useState } from "react";
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
  const [rejectModal, setRejectModal] = useState<{ id: string | null; reason: string }>({ id: null, reason: "" });
  const [ticketWarning, setTicketWarning] = useState(false);

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

  const updateStatus = async (id: string, status: Status, reason?: string) => {
    try {
      setUpdatingId(id);
      const body: any = { status };
      if (status === "REJECTED" && reason) body.reason = reason;
      const r = await fetch(`${API_URL}/store/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengubah status");
      if (status === "REJECTED") {
        setOrders(prev => prev.filter(o => o.id !== id));
      } else {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      }
    } catch (e: any) {
      const msg = e.message || "Gagal memperbarui status";
      setError(msg);
      if (msg.toLowerCase().includes("tiket tidak mencukupi")) {
        setTicketWarning(true);
      }
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
              <p>{o.menuItem.name} x {o.quantity ?? 1}</p>
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
            <Button size="sm" variant="outline" onClick={() => setRejectModal({ id: o.id, reason: "" })} disabled={!!updatingId}>
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
      <Modal isOpen={!!rejectModal.id} onClose={() => setRejectModal({ id: null, reason: "" })} className="max-w-md m-4">
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Tolak pesanan</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white/80">Alasan penolakan</label>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Contoh: stok habis"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              rows={3}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Apakah anda ingin menolak pesanan ini?</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setRejectModal({ id: null, reason: "" })}>Batal</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!rejectModal.id) return;
                updateStatus(rejectModal.id, "REJECTED", rejectModal.reason || "Ditolak toko");
                setRejectModal({ id: null, reason: "" });
              }}
              disabled={!!updatingId}
            >
              Iya, tolak
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={ticketWarning} onClose={() => setTicketWarning(false)} className="max-w-sm m-4">
        <div className="p-5 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59A2 2 0 0 1 16.518 17H3.482a2 2 0 0 1-1.742-3.311l6.517-11.59Z" clipRule="evenodd" />
              <path d="M11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M10 7v3" />
            </svg>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200">Tiket tidak mencukupi, silakan top up tiket terlebih dahulu agar bisa menerima orderan ini.</p>
          <div className="flex justify-center">
            <Button size="sm" onClick={() => setTicketWarning(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
