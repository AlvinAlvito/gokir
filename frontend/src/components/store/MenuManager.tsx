import { useEffect, useMemo, useState } from "react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import { Modal } from "../ui/modal";
import Badge from "../ui/badge/Badge";

const API_URL = import.meta.env.VITE_API_URL as string;
const toAbs = (rel?: string | null) => {
  if (!rel) return "";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
};

type Category = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
};

type Option = {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
  sortOrder: number;
};

type OptionGroup = {
  id: string;
  name: string;
  type: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  minSelect?: number | null;
  maxSelect?: number | null;
  sortOrder: number;
  options: Option[];
};

type Item = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  photoUrl?: string | null;
  categoryId?: string | null;
  isAvailable: boolean;
  sortOrder: number;
  optionGroups: OptionGroup[];
};

export default function MenuManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [catModal, setCatModal] = useState<{ mode: "add" | "edit"; data: Partial<Category> }>({ mode: "add", data: {} });
  const [itemModal, setItemModal] = useState<{ mode: "add" | "edit"; data: Partial<Item> }>({ mode: "add", data: {} });
  const [catOpen, setCatOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemPhotoFile, setItemPhotoFile] = useState<File | null>(null);
  const [itemPhotoPreview, setItemPhotoPreview] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const [rc, ri] = await Promise.all([
        fetch(`${API_URL}/store/menu/categories`, { credentials: "include" }),
        fetch(`${API_URL}/store/menu/items`, { credentials: "include" }),
      ]);
      const jc = await rc.json();
      const ji = await ri.json();
      if (!rc.ok || !jc?.ok) throw new Error(jc?.error?.message || "Gagal memuat kategori");
      if (!ri.ok || !ji?.ok) throw new Error(ji?.error?.message || "Gagal memuat item");
      setCategories(jc.data.categories || []);
      setItems(ji.data.items || []);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const categoryOptions = useMemo(() => categories.map(c => ({ label: c.name, value: c.id })), [categories]);

  const saveCategory = async () => {
    const payload = {
      name: catModal.data.name?.trim(),
      description: catModal.data.description?.trim() || undefined,
      sortOrder: catModal.data.sortOrder ?? undefined,
    };
    if (!payload.name) { setMsg("Nama kategori wajib"); return; }
    const isEdit = catModal.mode === "edit" && catModal.data.id;
    const url = isEdit ? `${API_URL}/store/menu/categories/${catModal.data.id}` : `${API_URL}/store/menu/categories`;
    const method = isEdit ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal simpan kategori");
    setCatModal({ mode: "add", data: {} });
    fetchAll();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    await fetch(`${API_URL}/store/menu/categories/${id}`, { method: "DELETE", credentials: "include" });
    fetchAll();
  };

const saveItem = async () => {
  const payload: any = {
    name: itemModal.data.name?.trim(),
    description: itemModal.data.description?.trim() || undefined,
    price: itemModal.data.price,
    promoPrice: itemModal.data.promoPrice || undefined,
    categoryId: itemModal.data.categoryId || undefined,
    isAvailable: itemModal.data.isAvailable ?? true,
    sortOrder: itemModal.data.sortOrder ?? 0,
  };
  if (!payload.name || !payload.price) { setMsg("Nama dan harga wajib"); return; }
  const photoUrl = await (async () => {
    if (!itemPhotoFile) return itemModal.data.photoUrl;
    const fd = new FormData();
    fd.append("photo", itemPhotoFile);
    const r = await fetch(`${API_URL}/store/menu/items/upload-photo`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const j = await r.json();
    if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Upload foto gagal");
    return j.data.photoUrl as string;
  })();
  if (photoUrl) payload.photoUrl = photoUrl;
    const isEdit = itemModal.mode === "edit" && itemModal.data.id;
    const url = isEdit ? `${API_URL}/store/menu/items/${itemModal.data.id}` : `${API_URL}/store/menu/items`;
    const method = isEdit ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal simpan item");
    setItemModal({ mode: "add", data: {} });
    fetchAll();
  };

const deleteItem = async (id: string) => {
    if (!confirm("Hapus item ini?")) return;
  await fetch(`${API_URL}/store/menu/items/${id}`, { method: "DELETE", credentials: "include" });
  fetchAll();
};

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Kategori Menu</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tambah dan atur kategori.</p>
          </div>
          <Button size="sm" onClick={() => { setCatModal({ mode: "add", data: {} }); setCatOpen(true); }}>Tambah Kategori</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {categories.map((c) => (
            <div key={c.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.description || "Tidak ada deskripsi"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCatModal({ mode: "edit", data: c }); setCatOpen(true); }} className="text-xs text-brand-500">Edit</button>
                  <button onClick={() => deleteCategory(c.id)} className="text-xs text-rose-500">Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Menu Item</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola item, opsi, dan harga.</p>
          </div>
          <Button size="sm" onClick={() => { setItemModal({ mode: "add", data: { isAvailable: true } }); setItemOpen(true); }}>Tambah Item</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-3">
                  {it.photoUrl ? (
                    <img
                      src={toAbs(it.photoUrl)}
                      alt={it.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-800"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
                      No Img
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">{it.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{it.description || "—"}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Rp{it.price}</p>
                    {it.promoPrice ? <p className="text-xs text-emerald-500">Promo: Rp{it.promoPrice}</p> : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={it.isAvailable ? "success" : "error"} size="sm">
                    {it.isAvailable ? "Tersedia" : "Tidak"}
                  </Badge>
                    <div className="flex gap-2 text-xs">
                    <button onClick={() => { setItemModal({ mode: "edit", data: it }); setItemOpen(true); }} className="text-brand-500">Edit</button>
                    <button onClick={() => deleteItem(it.id)} className="text-rose-500">Hapus</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}

      {/* Modal Kategori */}
      <Modal isOpen={catOpen} onClose={() => { setCatOpen(false); setCatModal({ mode: "add", data: {} }); }}>
        <div className="p-5 space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{catModal.mode === "add" ? "Tambah" : "Edit"} Kategori</h4>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input value={catModal.data.name || ""} onChange={(e: any) => setCatModal((p) => ({ ...p, data: { ...p.data, name: e.target.value } }))} />
            </div>
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Input value={catModal.data.description || ""} onChange={(e: any) => setCatModal((p) => ({ ...p, data: { ...p.data, description: e.target.value } }))} />
            </div>
            <div className="space-y-1">
              <Label>Urutan</Label>
              <Input type="number" value={catModal.data.sortOrder ?? 0} onChange={(e: any) => setCatModal((p) => ({ ...p, data: { ...p.data, sortOrder: Number(e.target.value) } }))} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setCatOpen(false); setCatModal({ mode: "add", data: {} }); }}>Batal</Button>
            <Button size="sm" onClick={() => saveCategory().catch((err) => setMsg(err.message))}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Item */}
      <Modal isOpen={itemOpen} onClose={() => { setItemOpen(false); setItemModal({ mode: "add", data: {} }); setItemPhotoFile(null); setItemPhotoPreview(null); }}>
        <div className="p-5 space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{itemModal.mode === "add" ? "Tambah" : "Edit"} Item</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input value={itemModal.data.name || ""} onChange={(e: any) => setItemModal((p) => ({ ...p, data: { ...p.data, name: e.target.value } }))} />
            </div>
            <div className="space-y-1">
              <Label>Harga</Label>
              <Input type="number" value={itemModal.data.price ?? ""} onChange={(e: any) => setItemModal((p) => ({ ...p, data: { ...p.data, price: Number(e.target.value) } }))} />
            </div>
            <div className="space-y-1">
              <Label>Harga Promo</Label>
              <Input type="number" value={itemModal.data.promoPrice ?? ""} onChange={(e: any) => setItemModal((p) => ({ ...p, data: { ...p.data, promoPrice: Number(e.target.value) } }))} />
            </div>
            <div className="space-y-1">
              <Label>Foto Menu (JPG/PNG/WEBP, maks 5MB)</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setItemPhotoFile(file);
                  setItemPhotoPreview(file ? URL.createObjectURL(file) : null);
                }}
                className="text-sm text-gray-700 dark:text-gray-200"
              />
              {(itemPhotoPreview || itemModal.data.photoUrl) && (
                <img
                  src={itemPhotoPreview || toAbs(itemModal.data.photoUrl) || ""}
                  alt="Preview menu"
                  className="w-24 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-800 mt-2"
                />
              )}
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select
                options={[{ label: "Tanpa Kategori", value: "" }, ...categoryOptions]}
                defaultValue={itemModal.data.categoryId || ""}
                onChange={(v: string) => setItemModal((p) => ({ ...p, data: { ...p.data, categoryId: v || null } }))}
                placeholder="Pilih kategori"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Deskripsi</Label>
              <Input value={itemModal.data.description || ""} onChange={(e: any) => setItemModal((p) => ({ ...p, data: { ...p.data, description: e.target.value } }))} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setItemOpen(false); setItemModal({ mode: "add", data: {} }); }}>Batal</Button>
            <Button size="sm" onClick={() => saveItem().catch((err) => setMsg(err.message))}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
