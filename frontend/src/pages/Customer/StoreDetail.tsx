import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";

const API_URL = import.meta.env.VITE_API_URL as string;

type Option = { id: string; name: string; priceDelta: number };
type OptionGroup = { id: string; name: string; type: "SINGLE" | "MULTIPLE"; isRequired: boolean; options: Option[] };
type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  photoUrl?: string | null;
  optionGroups: OptionGroup[];
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

const toAbs = (rel?: string | null) => {
  if (!rel) return "/images/user/owner.jpg";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
};

export default function StoreDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [orderModal, setOrderModal] = useState<{ item: MenuItem | null; qty: number; note: string; payment: "CASH" | "QRIS" }>({
    item: null,
    qty: 1,
    note: "",
    payment: "CASH",
  });

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/customer/stores/${id}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat toko");
      setStore(j.data.store);
      setCats(j.data.categories || []);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
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

  return (
    <>
      <PageMeta title="Detail Toko" description="Lihat menu dan info toko" />
      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
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
                    <div key={m.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900 flex flex-col gap-2">
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
                          <p className="text-xs text-gray-500 dark:text-gray-400">{m.description || "—"}</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Rp{m.price}</p>
                          {m.promoPrice ? <p className="text-xs text-emerald-500">Promo: Rp{m.promoPrice}</p> : null}
                        </div>
                      </div>
                      
                      <Button size="sm" variant="primary" onClick={() => setOrderModal({ item: m, qty: 1, note: "", payment: "CASH" })}>Pilih</Button>
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

      <Modal isOpen={!!orderModal.item} onClose={() => setOrderModal({ item: null, qty: 1, note: "", payment: "CASH" })} className="max-w-xl m-4">
        {orderModal.item && (
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              {orderModal.item.photoUrl ? (
                <img src={toAbs(orderModal.item.photoUrl)} alt={orderModal.item.name} className="w-32 h-32 rounded-xl object-cover border border-gray-200 dark:border-gray-800" />
              ) : (
                <div className="w-32 h-32 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-sm text-gray-400">
                  No Img
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{orderModal.item.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{orderModal.item.description || "—"}</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Rp{orderModal.item.price}</p>
                {orderModal.item.promoPrice ? <p className="text-xs text-emerald-500">Promo: Rp{orderModal.item.promoPrice}</p> : null}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Catatan untuk penjual</Label>
                <Input value={orderModal.note} onChange={(e: any) => setOrderModal((p) => ({ ...p, note: e.target.value }))} placeholder="Mis. tanpa sambal" />
              </div>
              <div className="flex items-center gap-3">
                <Label>Jumlah</Label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="dark:text-white" onClick={() => setOrderModal((p) => ({ ...p, qty: Math.max(1, p.qty - 1) }))}>-</Button>
                  <span className="w-8 text-center">{orderModal.qty}</span>
                  <Button size="sm" variant="outline" className="dark:text-white" onClick={() => setOrderModal((p) => ({ ...p, qty: p.qty + 1 }))}>+</Button>
                </div>
              </div>
              <div>
                <Label>Pembayaran</Label>
                <Select
                  options={[{ label: "Cash", value: "CASH" }, { label: "QRIS", value: "QRIS" }]}
                  defaultValue={orderModal.payment}
                  onChange={(v: string) => setOrderModal((p) => ({ ...p, payment: v as "CASH" | "QRIS" }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setOrderModal({ item: null, qty: 1, note: "", payment: "CASH" })}>Tutup</Button>
              <Button size="sm" onClick={async () => {
                if (!orderModal.item || !store) return;
                try {
                  setMsg(null);
                  const r = await fetch(`${API_URL}/customer/orders`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      storeProfileId: store.id,
                      orderType: "FOOD_EXISTING_STORE",
                      menuItemId: orderModal.item.id,
                      quantity: orderModal.qty,
                      note: orderModal.note || undefined,
                      paymentMethod: orderModal.payment,
                    }),
                  });
                  const j = await r.json();
                  if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal membuat order");
                  setMsg("Order berhasil dibuat.");
                  navigate("/orders");
                } catch (e: any) {
                  setMsg(e.message || "Terjadi kesalahan");
                } finally {
                  setOrderModal({ item: null, qty: 1, note: "", payment: "CASH" });
                }
              }}>Pesan Sekarang</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
