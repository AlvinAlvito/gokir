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
type CartStore = { storeProfileId: string; storeName?: string | null; storePhotoUrl?: string | null; items: CartItem[] };
type CartState = Record<string, CartStore>;

type CheckoutModal = {
  storeId: string | null;
  note: string;
  payment: "CASH" | "QRIS";
  address: string;
  maps: string;
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
  const [modal, setModal] = useState<CheckoutModal>({ storeId: null, note: "", payment: "CASH", address: "", maps: "", submitting: false });

  useEffect(() => {
    setCart(loadCart());
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

  const openCheckout = (storeId: string) => {
    const entry = cart[storeId];
    if (!entry) return;
    setModal({ storeId, note: "", payment: "CASH", address: "", maps: "", submitting: false });
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

  const closeModal = () => setModal({ storeId: null, note: "", payment: "CASH", address: "", maps: "", submitting: false });

  const placeOrder = async () => {
    if (!modal.storeId) return;
    const entry = cart[modal.storeId];
    if (!entry || entry.items.length === 0) return;
    const noteCombined = modal.maps ? [modal.note, `Maps: ${modal.maps}`].filter(Boolean).join("\n") : modal.note;
    try {
      setModal((p) => ({ ...p, submitting: true }));
      setError(null);
      for (const item of entry.items) {
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
      setMsg("Pesanan berhasil dibuat.");
      const copy = { ...cart };
      delete copy[modal.storeId];
      setCart(copy);
      saveCart(copy);
      closeModal();
      navigate("/orders/active");
    } catch (e: any) {
      setError(e.message || "Gagal membuat order");
      setModal((p) => ({ ...p, submitting: false }));
    }
  };

  const cartStores = Object.values(cart);

  return (
    <>
      <PageMeta title="Keranjang" description="Ringkasan pesanan Anda" />
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
            return (
              <div key={s.storeProfileId} className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <div className="flex items-center gap-3">
                  <img src={toAbs(s.storePhotoUrl)} className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-800" alt={s.storeName || "Store"} />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">{s.storeName || "Toko"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.items.length} item</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {s.items.map((it) => (
                    <div key={it.itemId} className="flex items-center justify-between gap-3 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
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
                <Input value={modal.note} onChange={(e: any) => setModal((p) => ({ ...p, note: e.target.value }))} placeholder="Mis. tanpa sambal" />
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
                <Input value={modal.address} onChange={(e: any) => setModal((p) => ({ ...p, address: e.target.value }))} placeholder="Jl xx No xx, Kos xx" />
              </div>
              <div>
                <Label>Link Google Maps (terisi otomatis)</Label>
                <Input value={modal.maps} onChange={(e: any) => setModal((p) => ({ ...p, maps: e.target.value }))} placeholder="https://www.google.com/maps?q=..." />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={closeModal}>Batal</Button>
              <Button size="sm" onClick={placeOrder} disabled={modal.submitting}>{modal.submitting ? "Memproses..." : "Pesan Sekarang"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
