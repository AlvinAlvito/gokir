import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { io, Socket } from "socket.io-client";

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
  estimatedFare?: number | null;
  distanceKm?: number | null;
  pickupRegion?: string | null;
  dropoffRegion?: string | null;
  customRegion?: string | null;
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

const parseRideNote = (note?: string | null) => {
  const pickupMapMatch = note?.match(/Maps:\s*(https?:\S+)/i);
  const dropoffMapMatch = note?.match(/DropoffMap:\s*(https?:\S+)/i);
  const pickupPhotoMatch = note?.match(/PickupPhoto:\s*([^\s\n]+)/i);
  const fareMatch = note?.match(/Estimasi harga:\s*Rp?\.?\s*([0-9.,]+)/i);
  let cleaned = note || "";
  cleaned = cleaned
    .replace(/Maps:\s*https?:\S+/gi, "")
    .replace(/DropoffMap:\s*https?:\S+/gi, "")
    .replace(/PickupPhoto:\s*\S+/gi, "")
    .replace(/Estimasi harga:[^\n]*/gi, "")
    .trim();
  return {
    pickupMap: pickupMapMatch ? pickupMapMatch[1] : null,
    dropoffMap: dropoffMapMatch ? dropoffMapMatch[1] : null,
    pickupPhoto: pickupPhotoMatch ? pickupPhotoMatch[1] : null,
    fare: fareMatch ? Number(fareMatch[1].replace(/[^0-9]/g, "")) : null,
    noteText: cleaned,
  };
};

const parseNoteMeta = (note?: string | null) => {
  if (!note) return { noteText: "", mapUrl: null as string | null, fare: null as number | null };
  const mapMatch = note.match(/Maps:\s*(https?:\S+)/i);
  const fareMatch = note.match(/Estimasi harga:\s*Rp?\.?\s*([0-9.,]+)/i);
  let cleaned = note.replace(/Maps:\s*https?:\S+/gi, "").replace(/Estimasi harga:[^\n]*/gi, "").trim();
  return {
    noteText: cleaned,
    mapUrl: mapMatch ? mapMatch[1] : null,
    fare: fareMatch ? Number(fareMatch[1].replace(/[^0-9]/g, "")) : null,
  };
};

export function DriverListOrderContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [hasActive, setHasActive] = useState(false);
  const [ticketWarning, setTicketWarning] = useState(false);
  const [activeWarning, setActiveWarning] = useState(false);
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
  useEffect(() => {
    const s: Socket = io(API_URL, { withCredentials: true, transports: ["websocket"] });
    s.on("orders:changed", fetchOrders);
    return () => {
      s.off("orders:changed", fetchOrders);
      s.disconnect();
    };
  }, []);

  const claim = async (id: string) => {
    if (hasActive) {
      setActiveWarning(true);
      return;
    }
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
      const msg = e.message || "Gagal mengambil orderan";
      setError(msg);
      if (msg.toLowerCase().includes("tiket tidak mencukupi")) {
        setTicketWarning(true);
      }
    } finally {
      setClaiming(null);
    }
  };

  const searchingOrders = useMemo(() => orders.filter(o => o.status === "SEARCHING_DRIVER"), [orders]);

  const renderCard = (o: Order) => {
    const rideNote = o.orderType === "RIDE" ? parseRideNote(o.note) : null;
    const noteMeta = o.orderType === "RIDE" ? null : parseNoteMeta(o.note);
    const fare = o.estimatedFare ?? rideNote?.fare ?? noteMeta?.fare ?? null;
    const distance = o.distanceKm ?? null;
    const region = o.store?.storeAvailability?.region || o.pickupRegion || o.customRegion || o.dropoffRegion;
    const storeMap =
      o.orderType === "FOOD_CUSTOM_STORE"
        ? o.customStoreAddress || noteMeta?.mapUrl || null
        : o.store?.storeProfile?.address
        ? noteMeta?.mapUrl || null
        : noteMeta?.mapUrl || null;
    return (
      <div key={o.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(o.createdAt)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Tipe: {typeLabel[o.orderType]}</p>
            {o.paymentMethod && <p className="text-xs text-gray-500">Metode: {o.paymentMethod}</p>}
            {region && <p className="text-xs text-gray-500">Wilayah: {region}</p>}
            {distance != null && <p className="text-xs text-gray-500">Perkiraan jarak: {distance} km</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge color={statusBadge[o.status]}>{statusLabel[o.status]}</Badge>
            {fare != null && <Badge color="success">Ongkir {currency(fare)}</Badge>}
          </div>
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
        {o.orderType === "FOOD_CUSTOM_STORE" && (
          <div className="space-y-1 text-sm text-gray-700 dark:text-white/90">
            <p className="font-semibold">Toko luar</p>
            <p>{o.customStoreName || "Toko luar"}</p>
          </div>
        )}
        {o.orderType === "FOOD_CUSTOM_STORE" && (
          <div className="space-y-1 text-sm text-gray-700 dark:text-white/90">
            <p className="font-semibold">Nama Toko</p>
            <p>{o.customStoreName || "Toko luar"}</p>
          </div>
        )}

        <div className="space-y-2 text-sm text-gray-700 dark:text-white/90">
          {o.menuItem && (
            <div>
              <p className="font-semibold">Jumlah item menu</p>
              <p className="text-xs text-gray-500">{o.quantity ?? 0} item</p>
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

          {o.orderType === "RIDE" ? (
            <>
              {rideNote?.noteText && (
                <div>
                  <p className="font-semibold">Catatan</p>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{rideNote.noteText}</p>
                </div>
              )}
              {(rideNote?.pickupMap || rideNote?.dropoffMap) && (
                <div className="space-y-1">
                  {rideNote.pickupMap && (
                    <a href={rideNote.pickupMap} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                      Buka lokasi pickup (Maps)
                    </a>
                  )}
                  {rideNote.dropoffMap && (
                    <a href={rideNote.dropoffMap} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                      Buka lokasi tujuan (Maps)
                    </a>
                  )}
                </div>
              )}
              {rideNote?.pickupPhoto && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Foto pickup</p>
                  <a
                    href={rideNote.pickupPhoto.startsWith("http") ? rideNote.pickupPhoto : `${API_URL}${rideNote.pickupPhoto.startsWith("/") ? "" : "/"}${rideNote.pickupPhoto}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Lihat foto pickup
                  </a>
                </div>
              )}
            </>
          ) : (
            (noteMeta?.noteText || noteMeta?.mapUrl) && (
              <div className="space-y-1">
                <p className="font-semibold">Catatan</p>
                {noteMeta?.noteText && <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{noteMeta.noteText}</p>}
          {storeMap && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(storeMap, "_blank", "noopener,noreferrer")}
            >
              Lihat Maps Toko
            </Button>
          )}
              </div>
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => claim(o.id)}
            disabled={!!claiming}
          >
            {claiming === o.id ? "Memproses..." : "Ambil orderan"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
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

      <Modal isOpen={ticketWarning} onClose={() => setTicketWarning(false)} className="max-w-sm m-4">
        <div className="p-5 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59A2 2 0 0 1 16.518 17H3.482a2 2 0 0 1-1.742-3.311l6.517-11.59Z" clipRule="evenodd" />
              <path d="M11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M10 7v3" />
            </svg>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200">Tiket tidak mencukupi, silakan top up tiket terlebih dahulu agar bisa mengambil orderan ini.</p>
          <div className="flex justify-center">
            <Button size="sm" onClick={() => setTicketWarning(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeWarning} onClose={() => setActiveWarning(false)} className="max-w-sm m-4">
        <div className="p-5 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59A2 2 0 0 1 16.518 17H3.482a2 2 0 0 1-1.742-3.311l6.517-11.59Z" clipRule="evenodd" />
              <path d="M11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M10 7v3" />
            </svg>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200">Ups anda sedang melakukan proses transaksi yang aktif sekarang, selesaikan proses itu dulu baru ambil orderan baru lagi yaa.</p>
          <div className="flex justify-center">
            <Button size="sm" onClick={() => setActiveWarning(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function DriverListOrderPage() {
  return (
    <>
      <PageMeta title="List Order" description="Order yang mencari driver" />
      <DriverListOrderContent />
    </>
  );
}
