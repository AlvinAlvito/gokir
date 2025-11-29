import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { Modal } from "../../components/ui/modal";

const API_URL = import.meta.env.VITE_API_URL as string;

type CartItem = { itemId: string; name: string; price: number; promoPrice?: number | null; qty: number; photoUrl?: string | null };
type CartStore = {
  storeProfileId: string;
  storeName?: string | null;
  storePhotoUrl?: string | null;
  storeMap?: string | null;
  items: CartItem[];
  orderType?: "FOOD_EXISTING_STORE" | "FOOD_CUSTOM_STORE";
  customStoreName?: string | null;
  customStoreAddress?: string | null;
  customRegion?: "KAMPUS_SUTOMO" | "KAMPUS_TUNTUNGAN" | "KAMPUS_PANCING" | "WILAYAH_LAINNYA";
};
type CartState = Record<string, CartStore>;

type Pricing = {
  under1Km: number;
  km1To1_5: number;
  km1_5To2: number;
  km2To2_5: number;
  km2_5To3: number;
  above3PerKm: number;
};

type CheckoutModal = {
  storeId: string | null;
  note: string;
  payment: "CASH" | "QRIS";
  address: string;
  maps: string;
  showEstimate: boolean;
  distanceKm: number | null;
  estimatedFare: number | null;
  submitting: boolean;
};

const currency = (v?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v ?? 0);

const toAbs = (rel?: string | null) => {
  if (!rel) return "/images/user/owner.jpg";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
};

const loadCart = (): CartState => {
  try {
    const raw = localStorage.getItem("cart");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const saveCart = (data: CartState) => localStorage.setItem("cart", JSON.stringify(data));

export default function CustomerCartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartState>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<CheckoutModal>({
    storeId: null,
    note: "",
    payment: "CASH",
    address: "",
    maps: "",
    showEstimate: false,
    distanceKm: null,
    estimatedFare: null,
    submitting: false,
  });
  const [activeWarning, setActiveWarning] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ note?: string; address?: string; maps?: string }>({});
  const [pricing, setPricing] = useState<Pricing | null>(null);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const r = await fetch(`${API_URL}/pricing/delivery`, { credentials: "include" });
        const j = await r.json();
        if (r.ok && j?.ok) setPricing(j.data.pricing);
      } catch {
        // silent fallback
      }
    };
    loadPricing();
  }, []);

  const removeItem = (storeId: string, itemId: string) => {
    setCart((prev) => {
      const copy: CartState = { ...prev };
      const entry = copy[storeId];
      if (!entry) return prev;
      entry.items = entry.items.filter((i) => i.itemId !== itemId);
      if (entry.items.length === 0) delete copy[storeId];
      saveCart(copy);
      return { ...copy };
    });
  };

  const calcItemsTotal = (entry: CartStore | undefined) => {
    if (!entry) return 0;
    return entry.items.reduce((sum, it) => sum + (it.promoPrice ?? it.price) * it.qty, 0);
  };

  const openCheckout = (storeId: string) => {
    const entry = cart[storeId];
    if (!entry) return;
    setModal({
      storeId,
      note: "",
      payment: "CASH",
      address: "",
      maps: "",
      showEstimate: false,
      distanceKm: null,
      estimatedFare: null,
      submitting: false,
    });
    setFieldErrors({});
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setModal((p) => ({ ...p, maps: `https://www.google.com/maps?q=${latitude},${longitude}` }));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const closeModal = () => {
    setModal({
      storeId: null,
      note: "",
      payment: "CASH",
      address: "",
      maps: "",
      showEstimate: false,
      distanceKm: null,
      estimatedFare: null,
      submitting: false,
    });
    setFieldErrors({});
  };

  const parseLatLngLocal = (url: string): { lat: number; lng: number } | null => {
    try {
      const qMatch = url.match(/q=([0-9.+-]+),([0-9.+-]+)/i);
      if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
      const atMatch = url.match(/@([0-9.+-]+),([0-9.+-]+)/i);
      if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
    } catch {
      return null;
    }
    return null;
  };

  const resolveLatLng = async (url: string) => {
    const local = parseLatLngLocal(url);
    if (local) return local;
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
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
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
      /* ignore */
    }
    return null;
  };

  const handleEstimate = async (storeMap?: string | null, userMap?: string | null) => {
    const pickupUrl = storeMap || "";
    const dropUrl = userMap || "";
    if (!pickupUrl || !dropUrl) {
      setError("Pastikan link Maps toko dan lokasi Anda terisi, lalu cek estimasi.");
      return;
    }
    const [p, d] = await Promise.all([resolveLatLng(pickupUrl), resolveLatLng(dropUrl)]);
    if (!p || !d) {
      setError("Gagal membaca koordinat dari link Maps.");
      setModal((pState) => ({ ...pState, showEstimate: false, distanceKm: null }));
      return;
    }
    const routeKm = await getRouteDistanceKm(p, d);
    const straight = haversineKm(p, d);
    const distance = routeKm ?? straight * 1.3;
    let est = 0;
    const cfg = pricing;
    if (cfg) {
      if (distance < 1) est = cfg.under1Km;
      else if (distance < 1.5) est = cfg.km1To1_5;
      else if (distance < 2) est = cfg.km1_5To2;
      else if (distance < 2.5) est = cfg.km2To2_5;
      else if (distance < 3) est = cfg.km2_5To3;
      else est = cfg.km2_5To3 + Math.max(0, distance - 3) * cfg.above3PerKm;
    } else {
      const baseFare = 4000;
      const perKm = 2000;
      est = Math.max(baseFare, Math.round(baseFare + distance * perKm));
    }
    setModal((pState) => ({
      ...pState,
      showEstimate: true,
      distanceKm: Number(distance.toFixed(2)),
      estimatedFare: Math.round(est),
    }));
    setMsg(`Estimasi harga Rp${Math.round(est).toLocaleString("id-ID")}`);
  };

  const placeOrder = async () => {
    if (!modal.storeId) return;
    const entry = cart[modal.storeId];
    if (!entry || entry.items.length === 0) return;
    const orderType = entry.orderType || "FOOD_EXISTING_STORE";
    const hasMaps = modal.maps ? `Maps: ${modal.maps}` : "";
    const newErrors: { note?: string; address?: string; maps?: string } = {};
    if (!modal.note.trim()) newErrors.note = "Kolom ini belum diisi";
    if (!modal.address.trim()) newErrors.address = "Kolom ini belum diisi";
    if (!modal.maps.trim()) newErrors.maps = "Kolom ini belum diisi";
    setFieldErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (!modal.showEstimate) {
      setError("Silakan cek estimasi harga terlebih dahulu.");
      return;
    }

    try {
      setModal((p) => ({ ...p, submitting: true }));
      setError(null);
      for (const item of entry.items) {
        if (orderType === "FOOD_CUSTOM_STORE") {
          const noteCombined = [modal.note, `Menu: ${item.name} x ${item.qty} @ ${item.price}`, hasMaps].filter(Boolean).join("\n");
          const r = await fetch(`${API_URL}/customer/orders`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderType: "FOOD_CUSTOM_STORE",
              customStoreName: entry.customStoreName || entry.storeName,
              customStoreAddress: entry.customStoreAddress || modal.address || modal.maps || "",
              customRegion: entry.customRegion || "WILAYAH_LAINNYA",
              quantity: item.qty,
              note: noteCombined || undefined,
              paymentMethod: modal.payment,
              dropoffAddress: modal.address || undefined,
            }),
          });
          const j = await r.json();
          if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal membuat order");
        } else {
          const noteCombined = hasMaps ? [modal.note, hasMaps].filter(Boolean).join("\n") : modal.note;
          const r = await fetch(`${API_URL}/customer/orders`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderType: "FOOD_EXISTING_STORE",
              storeProfileId: entry.storeProfileId,
              menuItemId: item.itemId,
              quantity: item.qty,
              note: noteCombined || undefined,
              paymentMethod: modal.payment,
              dropoffAddress: modal.address || undefined,
            }),
          });
          const j = await r.json();
          if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal membuat order");
        }
      }
      setMsg("Pesanan berhasil dibuat.");
      const copy = { ...cart };
      delete copy[modal.storeId];
      setCart(copy);
      saveCart(copy);
      closeModal();
      navigate("/orders/active");
    } catch (e: any) {
      const msgErr = e.message || "Gagal membuat order";
      setError(msgErr);
      if (msgErr.toLowerCase().includes("transaksi yang sedang berlangsung")) {
        setActiveWarning(true);
      }
      setModal((p) => ({ ...p, submitting: false }));
    }
  };

  const cartStores = Object.values(cart);
  const modalEntry = modal.storeId ? cart[modal.storeId] : undefined;

  return (
    <>
      <PageMeta title="Keranjang" description="Ringkasan pesanan Anda" />
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">Keranjang Kamu</h1>
      {msg && <div className="text-sm text-emerald-600 dark:text-emerald-400">{msg}</div>}
      {error && <div className="text-sm text-amber-600 dark:text-amber-400">{error}</div>}

      {cartStores.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
          <p>Keranjang belanjaan kamu masih kosong nih, ayok kita isi keranjang kamu..</p>
          <button
            onClick={() => navigate("/orders/food")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600 transition"
          >
            Lihat toko
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {cartStores.map((s) => {
            const subtotal = s.items.reduce((acc, it) => acc + (it.promoPrice ?? it.price) * it.qty, 0);
            const isCustom = (s.orderType || "FOOD_EXISTING_STORE") === "FOOD_CUSTOM_STORE";
            return (
              <div key={s.storeProfileId} className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <div className="flex items-center gap-3">
                  <img src={toAbs(s.storePhotoUrl)} className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-800" alt={s.storeName || "Store"} />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">{s.storeName || (isCustom ? "Pesanan custom" : "Toko")}</p>
                    {isCustom ? (
                      s.customStoreAddress ? (
                        <a
                          href={s.customStoreAddress}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200"
                        >
                          Lihat lokasi Maps
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Alamat custom tidak tersedia</p>
                      )
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.items.length} item</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {s.items.map((it, idx) => (
                    <div key={it.itemId || idx} className="flex items-center justify-between gap-3 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <img src={toAbs(it.photoUrl)} className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-800" alt={it.name} />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white/90">{it.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Qty {it.qty}</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{currency((it.promoPrice ?? it.price) * it.qty)}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removeItem(s.storeProfileId, it.itemId)}>Hapus</Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Subtotal</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{currency(subtotal)}</p>
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <Button size="sm" onClick={() => openCheckout(s.storeProfileId)}>Pesan sekarang</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!modal.storeId} onClose={closeModal} className="max-w-lg m-4">
        {modal.storeId && (
          <div className="p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Detail pengantaran</h3>
            <div className="space-y-3">
              <div>
                <Label>Catatan untuk penjual</Label>
                <Input
                  value={modal.note}
                  onChange={(e: any) => {
                    setModal((p) => ({ ...p, note: e.target.value }));
                    setFieldErrors((fe) => ({ ...fe, note: undefined }));
                  }}
                  placeholder="Mis. tanpa sambal"
                />
                {fieldErrors.note && <p className="text-xs text-red-500">{fieldErrors.note}</p>}
              </div>
              <div>
                <Label>Pembayaran</Label>
                <Select
                  options={[{ label: "Cash", value: "CASH" }, { label: "QRIS", value: "QRIS" }]}
                  defaultValue={modal.payment}
                  onChange={(v: string) => setModal((p) => ({ ...p, payment: v as "CASH" | "QRIS" }))}
                />
              </div>
              <div>
                <Label>Alamat tujuan</Label>
                <Input
                  value={modal.address}
                  onChange={(e: any) => {
                    setModal((p) => ({ ...p, address: e.target.value }));
                    setFieldErrors((fe) => ({ ...fe, address: undefined }));
                  }}
                  placeholder="Jl xx No xx, Kos xx"
                />
                {fieldErrors.address && <p className="text-xs text-red-500">{fieldErrors.address}</p>}
              </div>
              {modalEntry?.orderType === "FOOD_CUSTOM_STORE" && modalEntry?.customStoreAddress && (
                <div>
                  <Label>Lokasi toko (Maps)</Label>
                  <Input value={modalEntry.customStoreAddress} disabled />
                </div>
              )}
              {modalEntry?.orderType !== "FOOD_CUSTOM_STORE" && modalEntry?.storeMap && (
                <div>
                  <Label>Lokasi toko (Maps)</Label>
                  <Input value={modalEntry.storeMap} disabled />
                </div>
              )}
              <div>
                <Label>Lokasi anda pada maps</Label>
                <Input
                  value={modal.maps}
                  onChange={(e: any) => {
                    setModal((p) => ({ ...p, maps: e.target.value, showEstimate: false, distanceKm: null }));
                    setFieldErrors((fe) => ({ ...fe, maps: undefined }));
                  }}
                  placeholder="https://www.google.com/maps?q=..."
                />
                {fieldErrors.maps && <p className="text-xs text-red-500">{fieldErrors.maps}</p>}
              </div>
              {((modalEntry?.orderType !== "FOOD_CUSTOM_STORE" && modalEntry?.storeMap) || (modalEntry?.orderType === "FOOD_CUSTOM_STORE" && modalEntry?.customStoreAddress)) && (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pickup = modalEntry?.orderType === "FOOD_CUSTOM_STORE"
                        ? modalEntry.storeMap || modalEntry.customStoreAddress || ""
                        : modalEntry.storeMap || "";
                      const drop = modal.maps || "";
                      handleEstimate(pickup, drop);
                    }}
                    disabled={modal.submitting}
                  >
                    Cek estimasi harga
                  </Button>
            {modal.showEstimate ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 px-3 py-2">
                <p className="text-sm text-gray-800 dark:text-white/90">{msg || "Estimasi siap"}</p>
                {modal.distanceKm !== null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Perkiraan jarak: {modal.distanceKm} km</p>
                )}
                {modal.storeId && (
                  <div className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-200">
                    <p className="font-semibold text-gray-800 dark:text-white/90">Rincian biaya</p>
                    <p>Ongkir: {currency(modal.estimatedFare)}</p>
                    {cart[modal.storeId]?.items.map((it) => (
                      <p key={it.itemId}>
                        {it.name} x {it.qty} @ {currency(it.promoPrice ?? it.price)}
                      </p>
                    ))}
                    <p className="font-semibold text-gray-800 dark:text-white/90">
                      Total: {currency((modal.estimatedFare ?? 0) + calcItemsTotal(cart[modal.storeId]))}
                    </p>
                  </div>
                )}
              </div>
            ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Isi lokasi Anda lalu tekan cek estimasi untuk melihat estimasi ongkir.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={closeModal}>Batal</Button>
              <Button size="sm" onClick={placeOrder} disabled={modal.submitting}>{modal.submitting ? "Memproses..." : "Pesan Sekarang"}</Button>
            </div>
          </div>
        )}
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
          <p className="text-sm text-gray-700 dark:text-gray-200">Ups anda memiliki transaksi yang sedang berlangsung sekarang, harap tunggu sampai transaksi itu selesai lalu coba lagi.</p>
          <div className="flex justify-center">
            <Button size="sm" onClick={() => setActiveWarning(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
