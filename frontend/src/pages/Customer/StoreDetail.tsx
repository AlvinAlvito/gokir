import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";

const API_URL = import.meta.env.VITE_API_URL as string;

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  photoUrl?: string | null;
};

type Category = { id: string; name: string; description?: string | null; menuItems: MenuItem[] };

type StoreProfile = {
  id: string;
  userId?: string;
  storeName?: string | null;
  ownerName?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  status: string;
  user: {
    id?: string;
    phone?: string | null;
    email?: string | null;
    storeAvailability?: {
      status: "ACTIVE" | "INACTIVE";
      region?: string | null;
      locationUrl?: string | null;
      note?: string | null;
      openDays?: string | null;
      openTime?: string | null;
      closeTime?: string | null;
    } | null;
  };
};

type CartItem = { itemId: string; name: string; price: number; promoPrice?: number | null; qty: number; photoUrl?: string | null };
type CartStore = { storeProfileId: string; storeName?: string | null; storePhotoUrl?: string | null; storeMap?: string | null; items: CartItem[] };
type CartState = Record<string, CartStore>;

const toAbs = (rel?: string | null) => {
  if (!rel) return "/images/user/owner.jpg";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
};

const currency = (v?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v ?? 0);

const loadCart = (): CartState => {
  try {
    const raw = localStorage.getItem("cart");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const saveCart = (data: CartState) => {
  localStorage.setItem("cart", JSON.stringify(data));
};

export default function StoreDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const r = await fetch(`${API_URL}/customer/stores/${id}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat toko");
      setStore(j.data.store);
      setCats(j.data.categories || []);
    } catch (e: any) {
      // fallback error ditampilkan sebagai modal add? cukup abaikan toast lama
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const regionLabel = useMemo(() => {
    const val = store?.user.storeAvailability?.region;
    if (val === "KAMPUS_SUTOMO") return "Kampus UINSU Sutomo";
    if (val === "KAMPUS_PANCING") return "Kampus UINSU Pancing";
    if (val === "KAMPUS_TUNTUNGAN") return "Kampus UINSU Tuntungan";
    if (val === "WILAYAH_LAINNYA") return "Wilayah Lainnya";
    return "";
  }, [store?.user.storeAvailability?.region]);

  const changeQty = (id: string, delta: number) => {
    setQtyMap((prev) => {
      const next = Math.max(1, (prev[id] ?? 1) + delta);
      return { ...prev, [id]: next };
    });
  };

  const addToCart = (item: MenuItem) => {
    if (!store) return;
    const currentCart = loadCart();
    const storeEntry: CartStore = currentCart[store.id] ?? {
      storeProfileId: store.id,
      storeName: store.storeName,
      storePhotoUrl: store.photoUrl,
      storeMap: store.mapsUrl || store.user.storeAvailability?.locationUrl || null,
      items: [],
    };
    // pastikan update map jika baru ada
    storeEntry.storeMap = store.mapsUrl || store.user.storeAvailability?.locationUrl || storeEntry.storeMap || null;
    const qty = qtyMap[item.id] ?? 1;
    const existingIdx = storeEntry.items.findIndex((it) => it.itemId === item.id);
    if (existingIdx >= 0) {
      storeEntry.items[existingIdx].qty += qty;
    } else {
      storeEntry.items.push({ itemId: item.id, name: item.name, price: item.price, promoPrice: item.promoPrice ?? undefined, qty, photoUrl: item.photoUrl });
    }
    currentCart[store.id] = storeEntry;
    saveCart(currentCart);
    setAddedItem(item.name);
  };

  return (
    <>
      <PageMeta title="Detail Toko" description="Lihat menu dan info toko" />
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {store && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <img src={toAbs(store.photoUrl)} alt={store.storeName || "Store"} className="w-16 h-16 rounded-2xl object-cover border border-gray-200 dark:border-gray-800" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{store.storeName || "Tanpa Nama"}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{store.address || "Alamat tidak tersedia"}</p>
                  {store.user.phone && (
                    <a className="text-xs text-brand-500 hover:underline" href={`https://wa.me/${store.user.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Hubungi WA</a>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-start md:items-end">
                <Badge size="sm" color={store.user.storeAvailability?.status === "ACTIVE" ? "success" : "error"}>
                  {store.user.storeAvailability?.status === "ACTIVE" ? "Toko Aktif" : "Tidak Aktif"}
                </Badge>
                {regionLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{regionLabel}</span>}
                {store.user.storeAvailability?.note && <span className="text-xs text-gray-500 dark:text-gray-400">{store.user.storeAvailability.note}</span>}
                <Button size="sm" variant="outline" onClick={() => navigate("/cart")}>Lihat Keranjang</Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {cats.map((c) => (
              <div key={c.id} className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{c.name}</h3>
                    {c.description && <p className="text-xs text-gray-500 dark:text-gray-400">{c.description}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {c.menuItems.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900 flex flex-col gap-3">
                      <div className="flex gap-3">
                        {m.photoUrl ? (
                          <img src={toAbs(m.photoUrl)} alt={m.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
                            No Img
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 dark:text-white/90">{m.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{m.description || "-"}</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{currency(m.price)}</p>
                          {m.promoPrice ? <p className="text-xs text-emerald-500">Promo: {currency(m.promoPrice)}</p> : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="dark:text-white" onClick={() => changeQty(m.id, -1)}>-</Button>
                          <span className="w-8 text-center text-sm text-gray-800 dark:text-white/90">{qtyMap[m.id] ?? 1}</span>
                          <Button size="sm" variant="outline" className="dark:text-white" onClick={() => changeQty(m.id, 1)}>+</Button>
                        </div>
                        <Button size="sm" onClick={() => addToCart(m)}>Masukkan ke keranjang</Button>
                      </div>
                    </div>
                  ))}
                  {c.menuItems.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada menu di kategori ini.</p>}
                </div>
              </div>
            ))}
            {cats.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada menu yang tersedia.</p>}
          </div>
        </div>
      )}
      <Modal isOpen={!!addedItem} onClose={() => setAddedItem(null)} className="max-w-sm m-4">
        <div className="p-5 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.42l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Hore!</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {addedItem ? `${addedItem} telah ditambahkan ke keranjang.` : "Item telah ditambahkan ke keranjang."} Ayok kita lakukan transaksi sekarang.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setAddedItem(null)}>Lanjut belanja</Button>
            <Button size="sm" onClick={() => navigate("/cart")}>Keranjang</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
