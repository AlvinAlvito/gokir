import { useEffect, useMemo, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

const API_URL = import.meta.env.VITE_API_URL as string;

type UserAccount = {
  id: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
};

type CustomerProfile = {
  id: string;
  name: string;
  nim?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  photoUrl?: string | null;
};

export default function CustomerProfil() {
  const { isOpen, openModal, closeModal } = useModal();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [user, setUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  // form profil
  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");

  // form akun
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const defaultPhoto = "/images/user/owner.jpg";

  const currentPhotoSrc = useMemo(() => {
    if (photoPreview) return photoPreview;
    if (profile?.photoUrl) {
      if (/^https?:\/\//i.test(profile.photoUrl)) return profile.photoUrl;
      return `${API_URL}${profile.photoUrl.startsWith("/") ? "" : "/"}${profile.photoUrl}`;
    }
    return defaultPhoto;
  }, [photoPreview, profile?.photoUrl]);

  // fetch akun + profil
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setMsg(null);
        const ua = await fetch(`${API_URL}/customer/profile/account`, { credentials: "include" });
        const ju = await ua.json();
        if (!ua.ok || !ju?.ok) throw new Error(ju?.error?.message || "Gagal memuat akun");
        const u: UserAccount = ju.data.user;
        setUser(u);
        setUsername(u.username ?? "");
        setEmail(u.email ?? "");
        setPhone(u.phone ?? "");

        const r = await fetch(`${API_URL}/customer/profile/me`, { credentials: "include" });
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal memuat profil");
        const p: CustomerProfile = json.data.profile;
        setProfile(p);
        setName(p.name ?? "");
        setNim(p.nim ?? "");
        setWhatsapp(p.whatsapp ?? "");
        setAddress(p.address ?? "");
      } catch (e: any) {
        setMsg(e.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const buildFileUrl = (rel?: string | null) => {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel)) return rel;
    return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
  };

  function toTitleCase(str?: string | null): string {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

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

      const r = await fetch(`${API_URL}/customer/profile/account`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Simpan akun gagal");

      const u: UserAccount = json.data.user;
      setUser(u);
      setUsername(u.username ?? "");
      setEmail(u.email ?? "");
      setPhone(u.phone ?? "");
      setPassword("");
      setMsg("Akun berhasil disimpan");
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const onClickEdit = () => {
    setMsg(null);
    setPhotoPreview(null);
    setPhotoFile(null);
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

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      setMsg(null);

      let newPhotoUrl: string | undefined = undefined;
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        const ru = await fetch(`${API_URL}/customer/profile/photo`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const ju = await ru.json();
        if (!ru.ok || !ju?.ok) throw new Error(ju?.error?.message || "Upload foto gagal");
        newPhotoUrl = ju?.data?.photoUrl || ju?.data?.profile?.photoUrl;
      }

      const payload = {
        name: name.trim() || undefined,
        nim: nim.trim() || null,
        whatsapp: whatsapp.trim() || null,
        address: address.trim() || null,
        ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
      };

      const r = await fetch(`${API_URL}/customer/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Simpan profil gagal");

      const updated: CustomerProfile = json.data.profile;
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
      const r = await fetch(`${API_URL}/customer/profile/photo`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Hapus foto gagal");
      setProfile((p) => (p ? { ...p, photoUrl: null } as CustomerProfile : p));
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
      {/* Card Akun */}
      <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Akun Saya</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola username, email, telepon, dan password.</p>
            {user && (
              <div className="mt-2 inline-flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-100/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full">
                <span>ID: {user.id}</span>
                <span className="h-3 w-px bg-gray-300 dark:bg-gray-700" />
                <span>Role: {user.role}</span>
              </div>
            )}
          </div>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSaveAccount}>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e: any) => setUsername(e.target.value)} placeholder="mis. customer01" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label>No. Telepon</Label>
            <Input value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
          <div className="space-y-2">
            <Label>Password (kosongkan jika tidak diubah)</Label>
            <Input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading}>Simpan Akun</Button>
            {msg && <span className="text-sm text-amber-600 dark:text-amber-400">{msg}</span>}
          </div>
        </form>
      </div>

      {/* Card Profil */}
      <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Profil Customer</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data profil dan foto kamu.</p>
          </div>
          <div className="flex gap-3">
            <Button size="sm" variant="outline" onClick={handleDeletePhoto} disabled={loading || !profile?.photoUrl}>
              Hapus 
            </Button>
            <Button size="sm" onClick={onClickEdit} disabled={loading}>
              Edit 
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-1 flex flex-col items-center gap-3">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full shadow-sm dark:border-gray-800">
              <img src={currentPhotoSrc} alt="Customer" className="h-full w-full object-cover object-center" />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Foto: {profile?.photoUrl ? <a className="text-brand-500 hover:underline" href={buildFileUrl(profile.photoUrl)} target="_blank" rel="noreferrer">Lihat</a> : "—"}
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Nama Lengkap</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {toTitleCase(profile?.name) || "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">NIM</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.nim || "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.whatsapp || "—"}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Alamat</Label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
                {profile?.address || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal edit profil */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Edit Profil Customer</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ubah data profil dan foto.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={photoPreview || currentPhotoSrc} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div>
                <input type="file" accept="image/*" onChange={(e) => onPickPhoto(e.target.files?.[0] || null)} />
                <p className="mt-1 text-xs text-gray-400">JPG/PNG/WEBP, maks 5MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nama Lengkap</Label>
                <Input type="text" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Nama Lengkap" />
              </div>
              <div>
                <Label>NIM</Label>
                <Input type="text" value={nim} onChange={(e: any) => setNim(e.target.value)} placeholder="NIM" />
              </div>
              <div>
                <Label>No WhatsApp</Label>
                <Input type="tel" value={whatsapp} onChange={(e: any) => setWhatsapp(e.target.value)} placeholder="08xxxxxxxx" />
              </div>
              <div className="md:col-span-2">
                <Label>Alamat</Label>
                <Input type="text" value={address} onChange={(e: any) => setAddress(e.target.value)} placeholder="Alamat lengkap" />
              </div>
            </div>

            {msg && <div className="text-sm text-error-500">{msg}</div>}

            <div className="flex items-center gap-3 justify-end">
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
