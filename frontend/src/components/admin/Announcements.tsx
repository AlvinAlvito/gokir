import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2, Edit3, Plus } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL as string;

type Role = "CUSTOMER" | "DRIVER" | "STORE" | "ADMIN" | "SUPERADMIN";

type Announcement = {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string | null;
  forRole?: Role | null;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: Omit<Announcement, "id"> = {
  slug: "",
  title: "",
  description: "",
  imageUrl: "",
  link: "",
  forRole: null,
  sortOrder: 0,
  isActive: true,
};

export default function AnnouncementsAdmin() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Omit<Announcement, "id">>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const roleOptions: (Role | "")[] = ["", "CUSTOMER", "DRIVER", "STORE", "ADMIN", "SUPERADMIN"];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.title} ${i.description} ${i.slug}`.toLowerCase().includes(q));
  }, [items, search]);

  const buildImage = (url?: string | null) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const fetchData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_URL}/admin/announcements`, { credentials: "include" });
      const json = await r.json();
      if (!r.ok || json?.ok === false) throw new Error(json?.error?.message || "Gagal memuat data");
      setItems(json?.data ?? json);
    } catch (e: any) {
      setMsg(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setMsg(null);
    setShowModal(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      link: item.link ?? "",
      forRole: item.forRole ?? null,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive,
    });
    setFile(null);
    setMsg(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setMsg(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!editingId && !file) {
      setMsg("Gambar wajib diunggah.");
      return;
    }
    const fd = new FormData();
    fd.append("slug", form.slug);
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("sortOrder", String(form.sortOrder ?? 0));
    fd.append("isActive", String(form.isActive));
    if (form.link) fd.append("link", form.link);
    if (form.forRole) fd.append("forRole", form.forRole);
    if (file) fd.append("image", file);
    else if (form.imageUrl) fd.append("imageUrl", form.imageUrl);

    try {
      const isEdit = Boolean(editingId);
      const url = isEdit ? `${API_URL}/admin/announcements/${editingId}` : `${API_URL}/admin/announcements`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        credentials: "include",
        body: fd,
      });
      const json = await r.json();
      if (!r.ok || json?.ok === false) throw new Error(json?.error?.message || "Gagal menyimpan");
      setForm(emptyForm);
      setEditingId(null);
      setFile(null);
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      setMsg(e.message || "Gagal menyimpan");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    try {
      const r = await fetch(`${API_URL}/admin/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok || json?.ok === false) throw new Error(json?.error?.message || "Gagal hapus");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setMsg(e.message || "Gagal hapus");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Announcements</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola konten slider/mading per role.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Cari judul/slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-white/30"
          />
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            <RotateCcw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {editingId ? "Edit Announcement" : "Tambah Announcement"}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lengkapi detail pengumuman.</p>
              </div>
              <button
                onClick={closeModal}
                className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-200">Slug*</label>
                    <input
                      required
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-200">Title*</label>
                    <input
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-200">
                      Gambar (jpg/png, max 5MB){!editingId && <span className="text-error-500">*</span>}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full text-sm"
                    />
                    {(file || form.imageUrl) && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Pratinjau:</p>
                        <img
                          src={file ? URL.createObjectURL(file) : buildImage(form.imageUrl)}
                          alt="preview"
                          className="h-32 w-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-200">Link (opsional)</label>
                    <input
                      value={form.link ?? ""}
                      onChange={(e) => setForm({ ...form, link: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-200">Description*</label>
                    <textarea
                      required
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={5}
                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-700 dark:text-gray-200">Untuk Role</label>
                      <select
                        value={form.forRole ?? ""}
                        onChange={(e) => setForm({ ...form, forRole: (e.target.value as Role) || null })}
                        className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                      >
                        {roleOptions.map((r) => (
                          <option key={r || "all"} value={r}>
                            {r ? r : "Semua"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700 dark:text-gray-200">Urutan</label>
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 dark:text-gray-200">Aktif</label>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="h-4 w-4 accent-brand-500"
                    />
                  </div>
                </div>
              </div>

              {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
                >
                  {editingId ? "Simpan Perubahan" : "Buat Announcement"} <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Belum ada data.</p>
        ) : (
          filtered.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden flex flex-col"
            >
              <div className="h-32 bg-gray-100 dark:bg-gray-800">
                <img src={buildImage(it.imageUrl)} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Slug: {it.slug}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      it.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {it.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <h5 className="font-semibold text-gray-800 dark:text-white/90">{it.title}</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{it.description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Untuk: {it.forRole ?? "Semua"} • Urutan: {it.sortOrder}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => openEdit(it)}
                  className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600"
                >
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => onDelete(it.id)}
                  className="inline-flex items-center gap-1 text-sm text-error-500 hover:text-error-600"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
