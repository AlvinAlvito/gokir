import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import RideRoutePreview from "../../components/ride/RideRoutePreview";
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
  pickupMap?: string | null;
  dropoffMap?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  mapUrl?: string | null;
  paymentMethod?: string | null;
  quantity?: number | null;
  note?: string | null;
  rating?: { driverRating?: number | null; storeRating?: number | null } | null;
  createdAt: string;
  customer?: { id: string; username?: string | null; email?: string | null; phone?: string | null } | null;
  driver?: { id: string; username?: string | null; email?: string | null; phone?: string | null; driverProfile?: { facePhotoUrl?: string | null } | null } | null;
  store?: { id: string; storeProfile?: { storeName?: string | null; photoUrl?: string | null; address?: string | null; mapsUrl?: string | null } | null } | null;
  menuItem?: { id: string; name: string; price?: number | null; promoPrice?: number | null } | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  customStoreName?: string | null;
  customStoreAddress?: string | null;
};

type Pricing = {
  under1Km: number;
  km1To1_5: number;
  km1_5To2: number;
  km2To2_5: number;
  km2_5To3: number;
  above3PerKm: number;
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
const stepItemsFood: StepItem[] = [
  { key: "WAITING_STORE_CONFIRM", label: "Menunggu konfirmasi toko", desc: "Pesanan menunggu disetujui oleh toko." },
  { key: "CONFIRMED_COOKING", label: "Diproses toko", desc: "Pesanan kamu sedang dibuat oleh toko." },
  { key: "SEARCHING_DRIVER", label: "Mencari driver", desc: "Pesanan sudah selesai dibuat, sedang mencari driver." },
  { key: "DRIVER_ASSIGNED", label: "Driver ditemukan", desc: "Driver sudah ditemukan dan menjemput pesanan kamu." },
  { key: "ON_DELIVERY", label: "Sedang diantar", desc: "Pesanan sedang diantar ke lokasi tujuan kamu, pastikan alamat benar." },
  { key: "COMPLETED", label: "Selesai", desc: "Pesanan kamu sudah selesai diantarkan." },
];

const stepItemsRide: StepItem[] = [
  { key: "SEARCHING_DRIVER", label: "Mencari driver", desc: "Sedang mencari driver untuk perjalananmu." },
  { key: "DRIVER_ASSIGNED", label: "Driver ditemukan", desc: "Driver sudah ditemukan dan menjemput kamu." },
  { key: "ON_DELIVERY", label: "Sedang diantar", desc: "Perjalanan sedang berlangsung, pastikan lokasi tujuan benar." },
  { key: "COMPLETED", label: "Selesai", desc: "Perjalanan selesai." },
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

const parseLatLngFromUrl = (url?: string | null): { lat: number; lng: number } | null => {
  if (!url) return null;
  const q = url.match(/q=([0-9.+-]+),([0-9.+-]+)/i);
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };
  const at = url.match(/@([0-9.+-]+),([0-9.+-]+)/i);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };
  return null;
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

const parseRideMeta = (
  note?: string | null,
  orderExtra?: { pickupMap?: string | null; dropoffMap?: string | null }
) => {
  const pickupMap = note?.match(/PickupMap:\s*(https?:\S+)/i)?.[1] || note?.match(/Maps:\s*(https?:\S+)/i)?.[1] || null;
  const dropoffMap = note?.match(/DropoffMap:\s*(https?:\S+)/i)?.[1] || null;
  const urls = note?.match(/https?:\S+/g) || [];
  const fallbackPickup = pickupMap || urls[0] || orderExtra?.pickupMap || null;
  const fallbackDrop = dropoffMap || urls[1] || orderExtra?.dropoffMap || null;
  return { pickupMap: fallbackPickup, dropoffMap: fallbackDrop };
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
  const [ratingOpen, setRatingOpen] = useState(false);
  const [driverRating, setDriverRating] = useState(0);
  const [storeRating, setStoreRating] = useState(0);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [estimate, setEstimate] = useState<{ distanceKm: number; fare: number; itemsTotal: number; total: number } | null>(null);

  const fetchOrder = async () => {
    const endpoint = id ? `/customer/orders/${id}` : "/customer/orders/active";
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_URL}${endpoint}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat order");
      const o = j.data.order || null;
      setOrder(o);
      if (o?.rating) {
        setDriverRating(o.rating.driverRating ?? 0);
        setStoreRating(o.rating.storeRating ?? 0);
      }
    } catch (e: any) {
      setOrder(null);
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);
  useEffect(() => {
      const s: Socket = io(API_URL, { withCredentials: true, transports: ["websocket"] });
    s.on("orders:changed", fetchOrder);
    return () => {
      s.off("orders:changed", fetchOrder);
      s.disconnect();
    };
  }, []);

  const { noteText, proofsPickup, proofsDelivery } = parseNote(order?.note);
  const rideMeta = order?.orderType === "RIDE" ? parseRideMeta(order?.note, { pickupMap: order?.pickupMap, dropoffMap: order?.dropoffMap }) : null;
  const steps = order?.orderType === "RIDE" ? stepItemsRide : stepItemsFood;
  const currentStepIndex = useMemo(() => order ? steps.findIndex((s) => s.key === order.status) : -1, [order, steps]);
  const customItems = useMemo(() => {
    if (order?.orderType !== "FOOD_CUSTOM_STORE" || !noteText) return [];
    return noteText
      .split("\n")
      .map((ln) => ln.trim())
      .filter((ln) => ln.startsWith("-"))
      .map((ln) => {
        const m = ln.match(/-\s*(.+?)\s+x\s+(\d+)\s+@\s+([0-9]+)/i);
        if (!m) return null;
        const [, name, qtyStr, priceStr] = m;
        return { name: name.trim(), qty: Number(qtyStr), price: Number(priceStr) };
      })
      .filter(Boolean) as { name: string; qty: number; price: number }[];
  }, [order?.orderType, noteText]);

  const itemsTotal = useMemo(() => {
    if (!order) return 0;
    if (order.orderType === "FOOD_CUSTOM_STORE") {
      return customItems.reduce((sum, it) => sum + it.qty * it.price, 0);
    }
    if (!order.menuItem) return 0;
    const price = order.menuItem.promoPrice ?? order.menuItem.price ?? 0;
    return price * (order.quantity ?? 1);
  }, [order, customItems]);

  const stepDescOverride: Partial<Record<Status, string>> = {
    CONFIRMED_COOKING: "Pesanan kamu sedang dibuat oleh toko yaa",
    SEARCHING_DRIVER: "Pesanan kamu sudah selesai, dan sedang mencari driver untuk mengantar pesanan kamu.",
    DRIVER_ASSIGNED: "Driver sudah ditemukan dan sedang menjemput pesanan kamu",
    ON_DELIVERY: "Pesanan sedang diantar ke lokasi tujuan anda, pastikan alamat anda benar yaa",
    COMPLETED: "Pesanan kamu sudah selesai diantarkan",
  };

  const resolveLatLng = async (url?: string | null) => {
    const local = parseLatLngFromUrl(url || "");
    if (local) return local;
    if (!url) return null;
    try {
      const r = await fetch(`${API_URL}/utils/resolve-map?url=${encodeURIComponent(url)}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) return null;
      if (j.data?.lat && j.data?.lng) return { lat: j.data.lat, lng: j.data.lng };
    } catch {
      return null;
    }
    return null;
  };

  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const getRouteDistanceKm = async (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false&alternatives=false&steps=false`;
      const resp = await fetch(url);
      const j = await resp.json();
      if (resp.ok && j?.code === "Ok" && j?.routes?.[0]?.distance) {
        return j.routes[0].distance / 1000;
      }
    } catch {
      return null;
    }
    return null;
  };

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const r = await fetch(`${API_URL}/pricing/delivery`, { credentials: "include" });
        const j = await r.json();
        if (r.ok && j?.ok) setPricing(j.data.pricing);
      } catch {
        /* ignore */
      }
    };
    if (!pricing) loadPricing();
  }, [pricing]);

  useEffect(() => {
    const computeEstimate = async () => {
      if (!order || (order.orderType !== "FOOD_EXISTING_STORE" && order.orderType !== "FOOD_CUSTOM_STORE")) {
        setEstimate(null);
        return;
      }
      const pickupUrl =
        order.orderType === "FOOD_CUSTOM_STORE"
          ? order.customStoreAddress || order.pickupMap || null
          : order.store?.storeProfile?.mapsUrl || order.pickupMap || null;
      const dropUrl = order.mapUrl || order.dropoffMap || null;
      if (!pickupUrl || !dropUrl) {
        setEstimate(null);
        return;
      }
      const [p, d] = await Promise.all([
        order.pickupLat && order.pickupLng ? { lat: order.pickupLat, lng: order.pickupLng } : resolveLatLng(pickupUrl),
        order.dropoffLat && order.dropoffLng ? { lat: order.dropoffLat, lng: order.dropoffLng } : resolveLatLng(dropUrl),
      ]);
      if (!p || !d) {
        setEstimate(null);
        return;
      }
      const routeKm = await getRouteDistanceKm(p, d);
      const straight = haversineKm(p, d);
      const distance = routeKm ?? straight;
      let fare = 0;
      const cfg = pricing;
      if (cfg) {
        if (distance < 1) fare = cfg.under1Km;
        else if (distance < 1.5) fare = cfg.km1To1_5;
        else if (distance < 2) fare = cfg.km1_5To2;
        else if (distance < 2.5) fare = cfg.km2To2_5;
        else if (distance < 3) fare = cfg.km2_5To3;
        else fare = cfg.km2_5To3 + Math.max(0, distance - 3) * cfg.above3PerKm;
      }
      setEstimate({
        distanceKm: Number(distance.toFixed(2)),
        fare: Math.round(fare),
        itemsTotal,
        total: Math.round(fare) + itemsTotal,
      });
    };
    computeEstimate();
  }, [order, pricing, itemsTotal, customItems]);

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

  const submitRating = async () => {
    if (!order?.id) return;
    try {
      setRatingError(null);
      const payload: any = { driverRating };
      if (order.orderType === "FOOD_EXISTING_STORE") payload.storeRating = storeRating;
      const r = await fetch(`${API_URL}/customer/ratings/${order.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengirim rating");
      setRatingSuccess(true);
      setRatingOpen(false);
      fetchOrder();
    } catch (e: any) {
      setRatingError(e.message || "Gagal mengirim rating");
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
            {order.orderType !== "RIDE" ? (
              (() => {
                const pickupUrl = order.store?.storeProfile?.mapsUrl || order.pickupMap || null;
                const dropoffUrl = order.mapUrl || order.dropoffMap || null;
                if (!pickupUrl && !dropoffUrl) return null;
                return (
                  <RideRoutePreview
                    pickupUrl={pickupUrl || undefined}
                    dropoffUrl={dropoffUrl || undefined}
                    pickupCoord={order.pickupLat && order.pickupLng ? { lat: order.pickupLat, lng: order.pickupLng } : undefined}
                    dropoffCoord={order.dropoffLat && order.dropoffLng ? { lat: order.dropoffLat, lng: order.dropoffLng } : undefined}
                  />
                );
              })()
            ) : null}

            {order.orderType === "RIDE" && rideMeta ? (
              <RideRoutePreview
                pickupUrl={rideMeta.pickupMap || undefined}
                dropoffUrl={rideMeta.dropoffMap || undefined}
                pickupCoord={order.pickupLat && order.pickupLng ? { lat: order.pickupLat, lng: order.pickupLng } : undefined}
                dropoffCoord={order.dropoffLat && order.dropoffLng ? { lat: order.dropoffLat, lng: order.dropoffLng } : undefined}
              />
            ) : null}
            {steps.map((s: StepItem, idx: number) => {
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
                      {order.orderType === "FOOD_CUSTOM_STORE" ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">Detail Menu</p>
                          {customItems.length > 0 ? (
                            <ul className="text-sm text-gray-800 dark:text-white/90 list-disc list-inside space-y-0.5">
                              {customItems.map((it, idx) => (
                                <li key={idx}>
                                  {it.name} x {it.qty}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-800 dark:text-white/90 whitespace-pre-line">
                              {noteText?.includes("Menu:") ? noteText.replace(/^.*Menu:/s, "Menu:") : "-"}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">Catatan: {noteText ? noteText.split("Menu:")[0]?.trim() || "-" : "-"}</p>
                        </div>
                      ) : (
                        order.menuItem && (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Detail Menu</p>
                            <p>{order.menuItem.name} x {order.quantity ?? 1}</p>
                            <p className="text-xs text-gray-500">Perkiraan: {currency((order.menuItem.promoPrice ?? order.menuItem.price ?? 0) * (order.quantity ?? 1))}</p>
                            <p className="text-xs text-gray-500">Catatan: {noteText || "-"}</p>
                          </div>
                        )
                      )}
                      {estimate && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 p-3 space-y-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Rincian biaya</p>
                          <p className="text-xs text-gray-500">Perkiraan jarak: {estimate.distanceKm} km</p>
                          <p className="text-sm text-gray-800 dark:text-white/90">Ongkir: {currency(estimate.fare)}</p>
                          {order.orderType === "FOOD_CUSTOM_STORE" ? (
                            customItems.length > 0 ? (
                              <ul className="text-sm text-gray-800 dark:text-white/90 list-disc list-inside space-y-0.5">
                                {customItems.map((it, idx) => (
                                  <li key={idx}>
                                    {it.name} x {it.qty} @ {currency(it.price)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-800 dark:text-white/90 whitespace-pre-line">
                                {noteText?.includes("Menu:") ? noteText.replace(/^.*Menu:/s, "Menu:") : "-"}
                              </p>
                            )
                          ) : (
                            order.menuItem && (
                              <p className="text-sm text-gray-800 dark:text-white/90">
                                {order.menuItem.name} x {order.quantity ?? 1}
                              </p>
                            )
                          )}
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Total: {currency(estimate.fare + itemsTotal)}</p>
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

      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>Laporkan Transaksi</Button>
        {order.status === "COMPLETED" && (
          <Button size="sm" variant="outline" onClick={() => setRatingOpen(true)}>
            Beri Rating
          </Button>
        )}
        {((order.orderType === "FOOD_CUSTOM_STORE" && order.status === "SEARCHING_DRIVER") ||
          (order.orderType === "FOOD_EXISTING_STORE" && order.status === "WAITING_STORE_CONFIRM") ||
          (order.orderType === "RIDE" && order.status === "SEARCHING_DRIVER")) && (
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
            <p className="text-sm text-gray-600 dark:text-gray-300">Pesanan masih dalam proses awal. Yakin ingin membatalkan?</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(false)}>Batal</Button>
            <Button size="sm" onClick={cancelOrder} disabled={cancelLoading} className="bg-red-500 hover:bg-red-600 text-white">
              {cancelLoading ? "Memproses..." : "Batalkan"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={ratingOpen} onClose={() => setRatingOpen(false)} className="max-w-md m-4">
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Beri Rating</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">Rating driver</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setDriverRating(v)}
                  className={`text-2xl ${driverRating >= v ? "text-amber-500" : "text-gray-400"} hover:text-amber-500`}
                  type="button"
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          {order?.orderType === "FOOD_EXISTING_STORE" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">Rating toko</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setStoreRating(v)}
                    className={`text-2xl ${storeRating >= v ? "text-amber-500" : "text-gray-400"} hover:text-amber-500`}
                    type="button"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}
          {ratingError && <p className="text-xs text-amber-600 dark:text-amber-400">{ratingError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setRatingOpen(false)}>Batal</Button>
            <Button size="sm" onClick={submitRating}>Kirim rating</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={ratingSuccess} onClose={() => setRatingSuccess(false)} className="max-w-sm m-4">
        <div className="p-5 space-y-3 text-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Terima kasih!</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">Rating kamu sudah kami terima.</p>
          <div className="flex justify-center">
            <Button size="sm" onClick={() => setRatingSuccess(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
