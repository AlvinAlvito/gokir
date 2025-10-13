import { useEffect, useMemo, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

const API_URL = import.meta.env.VITE_API_URL as string;

type StoreProfileT = {
  id: string;
  userId: string;
  storeName?: string | null;
  description?: string | null;
  categories?: string | null; // CSV
  photoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function StoreProfile() {
  const { isOpen, openModal, closeModal } = useModal();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<StoreProfileT | null>(null);

  // form state
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const defaultPhoto = "/images/user/owner.jpg";

  const toAbs = (rel?: string | null) => {
    if (!rel) return defaultPhoto;
    if (/^https?:\/\//i.test(rel)) return rel;
    return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
  };

  const currentPhotoSrc = useMemo(() => {
    if (photoPreview) return photoPreview;
    return toAbs(profile?.photoUrl);
  }, [photoPreview, profile?.photoUrl]);

  // -------- Fetch profile saat mount --------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setMsg(null);
        const r = await fetch(`${API_URL}/store/profile/me`, {
          credentials: "include",
        });
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal memuat profil toko");
        const p: StoreProfileT = json.data.profile;
        setProfile(p);
        // sync form
        setStoreName(p.storeName ?? "");
        setDescription(p.description ?? "");
        setCategories(p.categories ?? "");
      } catch (e: any) {
        setMsg(e.message || "Gagal memuat profil toko");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onClickEdit = () => {
    setMsg(null);
    setPhotoPreview(null);
    setPhotoFile(null);
    // sync ulang form dari profile terbaru
    setStoreName(profile?.storeName ?? "");
    setDescription(profile?.description ?? "");
    setCategories(profile?.categories ?? "");
    openModal();
  };

  const onPickPhoto = (file?: File | null) => {
    setPhotoFile(file ?? null);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  // simpan perubahan profile
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      setMsg(null);

      // 1) upload foto kalau ada
      let newPhotoUrl: string | undefined = undefined;
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile); // field name di BE
        const ru = await fetch(`${API_URL}/store/profile/photo`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const ju = await ru.json();
        if (!ru.ok || !ju?.ok) throw new Error(ju?.error?.message || "Upload foto gagal");
        newPhotoUrl = ju?.data?.photoUrl || ju?.data?.profile?.photoUrl;
      }

      // 2) update data teks
      const payload: Partial<StoreProfileT> = {
        storeName: storeName.trim() || null,
        description: description.trim() || null,
        categories: categories.trim() || null, // CSV
        ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
      };

      const r = await fetch(`${API_URL}/store/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Simpan profil gagal");

      const updated: StoreProfileT = json.data.profile;
      setProfile(updated);
      setPhotoPreview(null);
      setPhotoFile(null);
      closeModal();
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/store/profile/photo`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Hapus foto gagal");
      setProfile((p) => (p ? { ...p, photoUrl: null } as StoreProfileT : p));
      setPhotoPreview(null);
      setPhotoFile(null);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header card */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            {/* Avatar */}
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
              <img
                src={currentPhotoSrc}
                alt="Store"
                className="h-full w-full object-cover object-center"
              />
            </div>

            {/* Info */}
            <div className="order-3 xl:order-2">
              <div className="flex items-center justify-center xl:justify-start gap-3 mb-1">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {profile?.storeName || "—"}
                </h4>
              </div>

              {profile?.description && (
                <div className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 text-center xl:text-left">
                  {profile.description}
                </div>
              )}

              {profile?.categories && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center xl:text-left">
                  Kategori: {profile.categories}
                </div>
              )}
            </div>

            {/* spacer kanan */}
            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end" />
          </div>

          <div className="flex items-center gap-3">
            {profile?.photoUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeletePhoto}
                disabled={loading}
              >
                Hapus Foto
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onClickEdit}
              disabled={loading}
            >
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Edit */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Profil Toko
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Perbarui informasi tokomu.
            </p>
          </div>

          <form className="flex flex-col" onSubmit={handleSave}>
            <div className="custom-scrollbar max-h-[60vh] overflow-y-auto px-2 pb-3">
              {/* Foto */}
              <div className="mb-6">
                <Label>Foto Profil</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                      src={photoPreview || currentPhotoSrc}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      JPG/PNG/WEBP, disarankan &lt; 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <Label>Nama Toko</Label>
                  <Input
                    type="text"
                    value={storeName}
                    onChange={(e: any) => setStoreName(e.target.value)}
                    placeholder="Nama Toko"
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label>Deskripsi</Label>
                  {/* jika kamu punya TextArea komponen sendiri, ganti ini */}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi singkat toko"
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    rows={4}
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label>Kategori (CSV)</Label>
                  <Input
                    type="text"
                    value={categories}
                    onChange={(e: any) => setCategories(e.target.value)}
                    placeholder="cth: makanan,minuman,merchandise"
                  />
                </div>
              </div>

              {msg && <div className="mt-4 text-sm text-error-500">{msg}</div>}
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button type="button" size="sm" variant="outline" onClick={closeModal} disabled={loading}>
                Tutup
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
