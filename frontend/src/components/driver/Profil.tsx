import { useEffect, useMemo, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

const API_URL = import.meta.env.VITE_API_URL as string;

type DriverStatus = "PENDING" | "APPROVED" | "REJECTED";

type DriverProfile = {
  id: string;
  name: string;
  nim?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  facePhotoUrl?: string | null; // path foto di server (kalau ada)
  status: DriverStatus;     // ⬅️ status keaktifan driver
};

export default function DriverProfilePage() {
  const { isOpen, openModal, closeModal } = useModal();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<DriverProfile | null>(null);

  // form state (edit)
  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const defaultPhoto = "/images/user/owner.jpg";

  const currentPhotoSrc = useMemo(() => {
    if (photoPreview) return photoPreview;
    if (profile?.facePhotoUrl) {
      if (/^https?:\/\//i.test(profile.facePhotoUrl)) return profile.facePhotoUrl;
      return `${API_URL}${profile.facePhotoUrl.startsWith("/") ? "" : "/"}${profile.facePhotoUrl}`;
    }
    return defaultPhoto;
  }, [photoPreview, profile?.facePhotoUrl]);

  // badge status
  const statusBadge = useMemo(() => {
    const s = profile?.status || "PENDING";
    const base =
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium";
    if (s === "APPROVED")
      return { text: "Aktif", klass: `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400` };
    if (s === "REJECTED")
      return { text: "Ditolak", klass: `${base} bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400` };
    return { text: "Menunggu Verifikasi", klass: `${base} bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400` };
  }, [profile?.status]);

  // -------- Fetch profile saat mount --------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setMsg(null);
        const r = await fetch(`${API_URL}/driver/profile/me`, {
          credentials: "include",
        });
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal memuat profil");
        const p: DriverProfile = json.data.profile;
        setProfile(p);
        // sync form
        setName(p.name ?? "");
        setNim(p.nim ?? "");
        setWhatsapp(p.whatsapp ?? "");
        setAddress(p.address ?? "");
      } catch (e: any) {
        setMsg(e.message || "Gagal memuat profil");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helpers
  function toTitleCase(str?: string | null): string {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

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

  // simpan perubahan profile
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      setMsg(null);

      // 1) upload foto kalau ada
      let newfacePhotoUrl: string | undefined = undefined;
      if (photoFile) {
        const fd = new FormData();
        fd.append("photo", photoFile); // field name di BE
        const ru = await fetch(`${API_URL}/driver/profile/photo`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const ju = await ru.json();
        if (!ru.ok || !ju?.ok) throw new Error(ju?.error?.message || "Upload foto gagal");
        newfacePhotoUrl = ju?.data?.facePhotoUrl || ju?.data?.profile?.facePhotoUrl;
      }

      // 2) update data teks
      const payload: Partial<DriverProfile> = {
        name: name.trim(),
        nim: nim.trim() || null,
        whatsapp: whatsapp.trim() || null,
        address: address.trim() || null,
        ...(newfacePhotoUrl ? { facePhotoUrl: newfacePhotoUrl } : {}),
      };

      const r = await fetch(`${API_URL}/driver/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Simpan profil gagal");

      const updated: DriverProfile = json.data.profile;
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
      const r = await fetch(`${API_URL}/driver/profile/photo`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Hapus foto gagal");
      setProfile((p) => (p ? { ...p, facePhotoUrl: null } as DriverProfile : p));
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
                alt="Driver"
                className="h-full w-full object-cover object-center"
              />
            </div>

            {/* Info */}
            <div className="order-3 xl:order-2">
              <div className="flex items-center justify-center xl:justify-start gap-3 mb-1">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {toTitleCase(profile?.name) || "—"}
                </h4>

                {/* Badge status */}
                <span className={statusBadge.klass}>
                  <span className="inline-block h-2 w-2 rounded-full bg-current opacity-60" />
                  {statusBadge.text}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  NIM {profile?.nim || "—"}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  WA {profile?.whatsapp || "—"}
                </p>
              </div>
              {profile?.address && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center xl:text-left">
                  {profile.address}
                </div>
              )}

              {/* Hint ketika belum aktif */}
              {profile?.status === "PENDING" && (
                <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 text-center xl:text-left">
                  Akun driver kamu sedang ditinjau. Mohon tunggu persetujuan admin/superadmin.
                </div>
              )}
              {profile?.status === "REJECTED" && (
                <div className="mt-3 text-xs text-red-600 dark:text-red-400 text-center xl:text-left">
                  Pendaftaran driver kamu ditolak. Periksa kembali dokumen dan ajukan ulang.
                </div>
              )}
            </div>

            {/* spacer kanan */}
            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end" />
          </div>

          <div className="flex items-center gap-3">
            {profile?.facePhotoUrl && (
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
              Edit Profil Driver
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Perbarui data profilmu.
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
                      JPG/PNG, disarankan &lt; 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div>
                  <Label>Nama Lengkap</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e: any) => setName(e.target.value)}
                    placeholder="Nama Lengkap"
                  />
                </div>
                <div>
                  <Label>NIM</Label>
                  <Input
                    type="text"
                    value={nim}
                    onChange={(e: any) => setNim(e.target.value)}
                    placeholder="NIM"
                  />
                </div>
                <div>
                  <Label>No WhatsApp</Label>
                  <Input
                    type="tel"
                    value={whatsapp}
                    onChange={(e: any) => setWhatsapp(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label>Alamat</Label>
                  <Input
                    type="text"
                    value={address}
                    onChange={(e: any) => setAddress(e.target.value)}
                    placeholder="Alamat lengkap"
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
