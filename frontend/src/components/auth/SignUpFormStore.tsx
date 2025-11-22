import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router"; // atau "react-router-dom"
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

const API_URL = import.meta.env.VITE_API_URL as string;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

declare global {
  interface Window {
    google?: any;
  }
}

export default function SignUpFormStore() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // form states
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [storePhoto, setStorePhoto] = useState<File | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // --- Google Identity Services button (STORE) ---
  useEffect(() => {
    if (!window.google || !googleBtnRef.current || !GOOGLE_CLIENT_ID) return;

    const cb = async (response: any) => {
      try {
        setLoading(true);
        setMsg(null);
        const r = await fetch(`${API_URL}/auth/store/login-google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken: response.credential }),
        });
        const json = await r.json();
        if (!r.ok || !json.ok) throw new Error(json?.error?.message || "Google sign-in failed");
        navigate("/dashboard/store");
      } catch (e: any) {
        setMsg(e.message || "Google sign-in error");
      } finally {
        setLoading(false);
      }
    };

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: cb,
      auto_select: false,
      ux_mode: "popup",
    });

    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "left",
      width: 360,
    });
  }, []);

  // --- Submit: Email Register (STORE) ---
  const onSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isChecked) {
      setMsg("Silakan setujui Syarat & Privasi terlebih dahulu.");
      return;
    }
    if (!storeName || !ownerName || !address || !mapsUrl || !email || !password || !confirm) {
      setMsg("Nama Toko, Pemilik, Alamat, Link Maps, email, password, dan konfirmasi wajib diisi.");
      return;
    }
    if (password.length < 6) {
      setMsg("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setMsg("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      setMsg(null);

      // Upload foto jika ada
      let photoUrl: string | undefined;
      if (storePhoto) {
        const fd = new FormData();
        fd.append("photo", storePhoto);
        const up = await fetch(`${API_URL}/auth/store/upload-photo`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const jUp = await up.json();
        if (!up.ok || !jUp.ok) throw new Error(jUp?.error?.message || "Upload foto gagal");
        photoUrl = jUp.data.photoUrl;
      }

      const payload = {
        email: email.trim(),
        password,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        address: address.trim(),
        mapsUrl: mapsUrl.trim(),
        phone: whatsapp.trim(),
        photoUrl,
      };

      const r = await fetch(`${API_URL}/auth/store/register-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) throw new Error(json?.error?.message || "Register gagal");

      // sukses → arahkan ke signin (login manual/email & pw)
      navigate("/signin");
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <img
            width={141}
            height={28}
            src="/images/logo/logo.png"
            alt="Logo"
            className="object-contain"
          />
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="flex items-center justify-start gap-3 mb-4">
            <h1 className="font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Daftarkan Toko Anda
            </h1>
          </div>

          <div>


            <form onSubmit={onSubmitRegister}>
              <div className="space-y-5">
                {/* Nama Toko */}
                <div>
                  <Label>
                    Nama Toko<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="storeName"
                    name="storeName"
                    placeholder="Contoh: Warung Gokir"
                    value={storeName}
                    onChange={(e: any) => setStoreName(e.target.value)}
                  />
                </div>

                {/* Nama Pemilik */}
                <div>
                  <Label>
                    Nama Pemilik<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="ownerName"
                    name="ownerName"
                    placeholder="Nama pemilik toko"
                    value={ownerName}
                    onChange={(e: any) => setOwnerName(e.target.value)}
                  />
                </div>

                {/* Alamat lengkap */}
                <div>
                  <Label>
                    Alamat Lengkap Toko<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="address"
                    name="address"
                    placeholder="Jl. Contoh No.1, Kota"
                    value={address}
                    onChange={(e: any) => setAddress(e.target.value)}
                  />
                </div>

                {/* Link Google Maps */}
                <div>
                  <Label>
                    Link Google Maps Toko<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="url"
                    id="mapsUrl"
                    name="mapsUrl"
                    placeholder="https://maps.google.com/?q=..."
                    value={mapsUrl}
                    onChange={(e: any) => setMapsUrl(e.target.value)}
                  />
                </div>

                {/* Foto Toko */}
                <div>
                  <Label>Foto Toko (JPG/PNG/WEBP, maks 5MB)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setStorePhoto(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-700 dark:text-gray-200"
                  />
                  {storePhoto && (
                    <p className="text-xs text-gray-500 mt-1">{storePhoto.name}</p>
                  )}
                </div>

                {/* No WhatsApp (opsional, simpan saat lengkapi profil) */}
                <div>
                  <Label>No WhatsApp <span className="text-error-500">*</span></Label>
                  <Input
                    type="tel"
                    id="whatsapp"
                    name="whatsapp"
                    placeholder="0812xxxxxxx"
                    value={whatsapp}
                    onChange={(e: any) => setWhatsapp(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Masukkan email"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Masukkan password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Konfirmasi Password */}
                <div>
                  <Label>
                    Konfirmasi Password<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ulangi password"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e: any) => setConfirm(e.target.value)}
                  />
                </div>

                {/* Checkbox */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    Dengan membuat akun, kamu setuju dengan{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Syarat dan Ketentuan
                    </span>{" "}
                    serta{" "}
                    <span className="text-gray-800 dark:text-white">
                      Kebijakan Privasi
                    </span>
                    .
                  </p>
                </div>

                {/* Error/Info */}
                {msg && <div className="text-sm text-error-500">{msg}</div>}

                {/* Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
                  >
                    {loading ? "Processing..." : "Sign Up"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Sudah punya akun?
                <Link
                  to="/signin"
                  className="ml-1 text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
