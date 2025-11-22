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
  ownerName?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  description?: string | null;
  categories?: string | null; // CSV
  photoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UserInfo = {
  id: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
};

export default function StoreProfile() {
  const { isOpen, openModal, closeModal } = useModal();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<StoreProfileT | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accountModal, setAccountModal] = useState(false);

  // form state
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // account form
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

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
        const u: UserInfo | undefined = json.data.user;
        setProfile(p);
        setUser(u ?? null);
        setUsername(u?.username ?? "");
        setEmail(u?.email ?? "");
        setPhone(u?.phone ?? "");
        // sync form
        setStoreName(p.storeName ?? "");
        setOwnerName(p.ownerName ?? "");
        setAddress(p.address ?? "");
        setMapsUrl(p.mapsUrl ?? "");
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
    setOwnerName(profile?.ownerName ?? "");
    setAddress(profile?.address ?? "");
    setMapsUrl(profile?.mapsUrl ?? "");
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

  const onClickAccountEdit = () => {
    setMsg(null);
    setPassword("");
    setAccountModal(true);
  };

  const handleSaveAccount = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      setMsg(null);
      const payload: any = {
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };
      if (password.trim()) payload.password = password.trim();

      const r = await fetch(`${API_URL}/store/profile/account`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Simpan akun gagal");

      const u: UserInfo = json.data.user;
      setUser(u);
      setUsername(u.username ?? "");
      setEmail(u.email ?? "");
      setPhone(u.phone ?? "");
      setPassword("");
      setAccountModal(false);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
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
        ownerName: ownerName.trim() || null,
        address: address.trim() || null,
        mapsUrl: mapsUrl.trim() || null,
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

  const embedUrl = useMemo(() => {
    if (!profile?.mapsUrl) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(profile.mapsUrl)}&output=embed`;
  }, [profile?.mapsUrl]);

  return (
    <>
      {/* Card Akun User */}
      <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Akun Toko</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Data akun dari tabel User.</p>
            {user && (
              <div className="mt-2 inline-flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-100/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full">
                <span>ID: {user.id}</span>
                <span className="h-3 w-px bg-gray-300 dark:bg-gray-700" />
                <span>Role: {user.role}</span>
              </div>
            )}
          </div>
          <div>
            <Button size="sm" variant="outline" onClick={onClickAccountEdit} disabled={loading}>
              Edit Akun
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">Username</Label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
              {user?.username || "—"}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">Email</Label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
              {user?.email || "—"}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400">No. Telepon</Label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
              {user?.phone || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Card Profil Toko */}
      <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Profil Toko</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Data lengkap toko (StoreProfile).</p>
          </div>
          <div className="flex gap-3">
            {profile?.photoUrl && (
              <Button size="sm" variant="outline" onClick={handleDeletePhoto} disabled={loading}>
                Hapus Foto
              </Button>
            )}
            <Button size="sm" onClick={onClickEdit} disabled={loading}>
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-1 flex flex-col items-center gap-3">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full shadow-sm dark:border-gray-800">
              <img
                src={currentPhotoSrc}
                alt="Store"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Foto: {profile?.photoUrl ? <a className="text-brand-500 hover:underline" href={toAbs(profile.photoUrl)} target="_blank" rel="noreferrer">Lihat</a> : "—"}
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Nama Toko</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.storeName || "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Nama Pemilik</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.ownerName || "—"}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Alamat Lengkap</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.address || "—"}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Link Google Maps</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.mapsUrl ? (
                  <a className="text-brand-500 hover:underline" href={profile.mapsUrl} target="_blank" rel="noreferrer">
                    {profile.mapsUrl}
                  </a>
                ) : "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {user?.phone || "—"}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Deskripsi</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 min-h-[44px]">
                {profile?.description || "—"}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Kategori (CSV)</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.categories || "—"}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Foto Toko</Label>
              {profile?.photoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                    <img src={toAbs(profile.photoUrl)} alt="Foto toko" className="w-full h-full object-cover" />
                  </div>
                  <a
                    className="text-brand-500 hover:underline text-sm"
                    href={toAbs(profile.photoUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lihat gambar
                  </a>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                  —
                </div>
            )}
          </div>
         
        </div>
        </div>

        {embedUrl && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">Lokasi di Google Maps</p>
            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <iframe src={embedUrl} className="w-full h-56 pointer-events-none" loading="lazy"></iframe>
              <a
                href={profile?.mapsUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0"
                aria-label="Buka Google Maps"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal Edit */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[760px] m-4">
        <div className="no-scrollbar relative w-full max-w-[760px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
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
                <Label>Foto Toko</Label>
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
                      JPG/PNG/WEBP, disarankan &lt; 5MB.
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
                  <Label>Nama Pemilik</Label>
                  <Input
                    type="text"
                    value={ownerName}
                    onChange={(e: any) => setOwnerName(e.target.value)}
                    placeholder="Nama pemilik"
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label>Alamat Lengkap</Label>
                  <Input
                    type="text"
                    value={address}
                    onChange={(e: any) => setAddress(e.target.value)}
                    placeholder="Jl. Contoh No.1, Kota"
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label>Link Google Maps</Label>
                  <Input
                    type="url"
                    value={mapsUrl}
                    onChange={(e: any) => setMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label>Deskripsi</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi singkat toko"
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    rows={3}
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

      {/* Modal Edit Akun */}
      <Modal isOpen={accountModal} onClose={() => setAccountModal(false)} className="max-w-[640px] m-4">
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Edit Akun Toko</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ubah username, email, telepon, atau password.</p>
          </div>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSaveAccount}>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} onChange={(e: any) => setUsername(e.target.value)} placeholder="mis. toko01" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>No. WhatsApp</Label>
              <Input value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Password (kosongkan jika tidak diubah)</Label>
              <Input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            {msg && <div className="md:col-span-2 text-sm text-error-500">{msg}</div>}
            <div className="md:col-span-2 flex items-center gap-3 justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => setAccountModal(false)} disabled={loading}>Tutup</Button>
              <Button type="submit" size="sm" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
