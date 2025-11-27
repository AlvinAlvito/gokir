import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import { Modal } from "../../components/ui/modal";

const API_URL = import.meta.env.VITE_API_URL as string;

type Region = "KAMPUS_SUTOMO" | "KAMPUS_TUNTUNGAN" | "KAMPUS_PANCING" | "WILAYAH_LAINNYA";

type StoreCard = {
  user: {
    id: string;
    phone?: string | null;
    storeProfile: {
      id: string;
      storeName?: string | null;
      ownerName?: string | null;
      address?: string | null;
      photoUrl?: string | null;
      description?: string | null;
    };
  };
  status: "ACTIVE" | "INACTIVE";
  region: Region;
};

type CustomItem = { id: string; name: string; qty: number; price: number };

type CartItem = { itemId: string; name: string; price: number; promoPrice?: number | null; qty: number; photoUrl?: string | null };

type CartStore = {
  storeProfileId: string;
  storeName?: string | null;
  storePhotoUrl?: string | null;
  items: CartItem[];
  orderType?: "FOOD_EXISTING_STORE" | "FOOD_CUSTOM_STORE";
  customStoreName?: string | null;
  customStoreAddress?: string | null;
  customRegion?: Region;
};

type CartState = Record<string, CartStore>;

const regionOptions = [
  { label: "Semua Wilayah", value: "" },
  { label: "Kampus UINSU Sutomo", value: "KAMPUS_SUTOMO" },
  { label: "Kampus UINSU Pancing", value: "KAMPUS_PANCING" },
  { label: "Kampus UINSU Tuntungan", value: "KAMPUS_TUNTUNGAN" },
  { label: "Wilayah Lainnya", value: "WILAYAH_LAINNYA" },
];

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

export default function OrdersFoodPage() {
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [region, setRegion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStore, setCustomStore] = useState<{ name: string; maps: string; region: Region | ""; payment: "CASH" | "QRIS"; items: CustomItem[] }>({
    name: "",
    maps: "",
    region: "",
    payment: "CASH",
    items: [{ id: "item-1", name: "", qty: 1, price: 0 }],
  });
  const navigate = useNavigate();

  const fetchStores = async (regionParam?: string) => {
    try {
      setLoading(true);
      setMsg(null);
      const url = new URL(`${API_URL}/customer/stores`);
      if (regionParam) url.searchParams.set("region", regionParam);
      const r = await fetch(url.toString(), { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat toko");
      setStores(j.data.stores || []);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStores(); }, []);

  const filtered = useMemo(() => stores, [stores]);

  const addCustomItem = () => {
    setCustomStore((p) => ({
      ...p,
      items: [...p.items, { id: `item-${p.items.length + 1}`, name: "", qty: 1, price: 0 }],
    }));
  };

  const updateCustomItem = (id: string, field: keyof CustomItem, value: string | number) => {
    setCustomStore((p) => ({
      ...p,
      items: p.items.map((it) => (it.id === id ? { ...it, [field]: field === "name" ? value : Number(value) } : it)),
    }));
  };

  const addCustomToCart = () => {
    if (!customStore.name.trim()) {
      setMsg("Nama toko wajib diisi untuk pesanan custom");
      return;
    }
    if (!customStore.region) {
      setMsg("Pilih wilayah pesanan custom");
      return;
    }
    const validItems = customStore.items.filter((it) => it.name.trim() && it.qty > 0 && it.price >= 0);
    if (validItems.length === 0) {
      setMsg("Tambahkan minimal 1 menu dengan nama, jumlah, dan harga");
      return;
    }
    const cart = loadCart();
    const key = `custom-${Date.now()}`;
    cart[key] = {
      storeProfileId: key,
      storeName: customStore.name,
      storePhotoUrl: null,
      items: validItems.map((it) => ({
        itemId: `${key}-${it.id}`,
        name: it.name,
        qty: it.qty,
        price: it.price,
      })),
      orderType: "FOOD_CUSTOM_STORE",
      customStoreName: customStore.name,
      customStoreAddress: customStore.maps,
      customRegion: customStore.region || "WILAYAH_LAINNYA",
    };
    saveCart(cart);
    setMsg("Pesanan custom ditambahkan ke keranjang");
    setCustomOpen(false);
  };

  return (
    <>
      <PageMeta title="Pesan Makanan" description="Pilih toko berdasarkan wilayah" />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pilih Toko</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Filter berdasarkan wilayah, lalu lihat menu.</p>
          </div>
          <div className="w-64">
            <Select
              options={regionOptions}
              defaultValue={region}
              onChange={(v: string) => { setRegion(v); fetchStores(v || undefined); }}
              placeholder="Pilih wilayah"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-4 shadow-theme-xs dark:border-brand-500/40 dark:bg-white/[0.05] flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-800 dark:text-white/90">Toko atau makanan yang kamu cari belum terdaftar di aplikasi Gokir?</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Kamu ingin pesan makanan custom?</p>
          </div>
          <Button size="sm" onClick={() => setCustomOpen(true)}>Pesan makanan custom</Button>
        </div>

        {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
        {loading ? (
          <p className="text-sm text-gray-500">Memuat...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <div key={s.user.storeProfile.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img src={toAbs(s.user.storeProfile.photoUrl)} alt={s.user.storeProfile.storeName || "Store"} className="w-14 h-14 object-cover rounded-xl border border-gray-200 dark:border-gray-800" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">{s.user.storeProfile.storeName || "Tanpa Nama"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.user.storeProfile.address || "Alamat tidak tersedia"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/90">
                  <Badge size="sm" color={s.status === "ACTIVE" ? "success" : "error"}>
                    {s.status === "ACTIVE" ? "Toko Aktif" : "Tidak Aktif"}
                  </Badge>
                  <span className="text-xs text-gray-500">{regionOptions.find(r => r.value === s.region)?.label || ""}</span>
                </div>
                <Button size="sm" onClick={() => navigate(`/orders/food/${s.user.storeProfile.id}`)}>
                  Lihat Menu
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={customOpen} onClose={() => setCustomOpen(false)} className="max-w-2xl m-4">
        <div className="p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Pesan makanan custom</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-white/80">Nama toko</label>
              <Input value={customStore.name} onChange={(e: any) => setCustomStore((p) => ({ ...p, name: e.target.value }))} placeholder="Contoh: Warung Bu Ani" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-white/80">Wilayah</label>
              <Select
                options={[
                  { label: "Kampus UINSU Sutomo", value: "KAMPUS_SUTOMO" },
                  { label: "Kampus UINSU Pancing", value: "KAMPUS_PANCING" },
                  { label: "Kampus UINSU Tuntungan", value: "KAMPUS_TUNTUNGAN" },
                  { label: "Wilayah Lainnya (muncul di semua wilayah)", value: "WILAYAH_LAINNYA" },
                ]}
                defaultValue={customStore.region || ""}
                onChange={(v: string) => setCustomStore((p) => ({ ...p, region: v as Region }))}
                placeholder="Pilih wilayah"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white/80">Link Google Maps toko</label>
              <Input value={customStore.maps} onChange={(e: any) => setCustomStore((p) => ({ ...p, maps: e.target.value }))} placeholder="https://maps.google.com/..." />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800 dark:text-white/90">Daftar menu</p>
              <Button size="xs" variant="outline" onClick={addCustomItem}>Tambah menu</Button>
            </div>
            <div className="space-y-3">
              {customStore.items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-300">Nama item {idx + 1}</label>
                    <Input value={it.name} onChange={(e: any) => updateCustomItem(it.id, "name", e.target.value)} placeholder="Nasi Goreng" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-300">Jumlah</label>
                    <Input type="number" min={1} value={it.qty} onChange={(e: any) => updateCustomItem(it.id, "qty", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-300">Harga satuan</label>
                    <Input type="number" min={0} value={it.price} onChange={(e: any) => updateCustomItem(it.id, "price", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-white/80">Pembayaran</label>
            <Select
              options={[{ label: "Cash", value: "CASH" }, { label: "QRIS", value: "QRIS" }]}
              defaultValue={customStore.payment}
              onChange={(v: string) => setCustomStore((p) => ({ ...p, payment: v as "CASH" | "QRIS" }))}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setCustomOpen(false)}>Batal</Button>
            <Button size="sm" onClick={addCustomToCart}>Tambahkan ke keranjang</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
