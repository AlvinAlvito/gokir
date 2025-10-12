import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

const API_URL = import.meta.env.VITE_API_URL as string;

export default function SignUpFormDriver() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [idCard, setIdCard] = useState<File | null>(null);
  const [studentCard, setStudentCard] = useState<File | null>(null);
  const [facePhoto, setFacePhoto] = useState<File | null>(null);

  const navigate = useNavigate();

  const onSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isChecked) return setMsg("Silakan setujui Syarat & Privasi terlebih dahulu.");
    if (!name || !nim || !birthPlace || !birthDate || !email || !password || !confirm) {
      return setMsg("Semua field wajib diisi.");
    }
    if (password.length < 6) return setMsg("Password minimal 6 karakter.");
    if (password !== confirm) return setMsg("Konfirmasi password tidak cocok.");
    if (!idCard || !studentCard || !facePhoto) {
      return setMsg("Unggah KTP, KTM, dan Foto Wajah.");
    }

    try {
      setLoading(true);
      setMsg(null);

      const fd = new FormData();
      fd.append("email", email.trim());
      fd.append("password", password);
      fd.append("name", name.trim());
      fd.append("nim", nim.trim());
      fd.append("birthPlace", birthPlace.trim());
      fd.append("birthDate", birthDate);
      fd.append("whatsapp", whatsapp.trim()); // 👈 ditambahkan
      fd.append("idCard", idCard);
      fd.append("studentCard", studentCard);
      fd.append("facePhoto", facePhoto);


      const r = await fetch(`${API_URL}/auth/driver/register`, {
        method: "POST",
        credentials: "include",
        body: fd
        // NOTE: JANGAN set "Content-Type": browser akan set boundary otomatis
      });
      const json = await r.json();
      if (!r.ok || !json.ok) throw new Error(json?.error?.message || "Register gagal");

      navigate("/signin", { replace: true });
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
          <img width={141} height={28} src="/images/logo/logo.png" alt="Logo" className="object-contain" />
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="flex items-center justify-start gap-3 mb-4">
            <h1 className="font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Daftar Driver
            </h1>
          </div>

          <form onSubmit={onSubmitRegister}>
            <div className="space-y-5">
              <div>
                <Label>Nama Lengkap<span className="text-error-500">*</span></Label>
                <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Nama sesuai KTP/KTM" />
              </div>

              <div>
                <Label>NIM<span className="text-error-500">*</span></Label>
                <Input value={nim} onChange={(e: any) => setNim(e.target.value)} placeholder="2112345" />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label>Tempat Lahir<span className="text-error-500">*</span></Label>
                  <Input value={birthPlace} onChange={(e: any) => setBirthPlace(e.target.value)} placeholder="Medan" />
                </div>
                <div>
                  <Label>Tanggal Lahir<span className="text-error-500">*</span></Label>
                  <Input type="date" value={birthDate} onChange={(e: any) => setBirthDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>No WhatsApp<span className="text-error-500">*</span></Label>
                <Input
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  value={whatsapp}
                  onChange={(e: any) => setWhatsapp(e.target.value)}
                />
              </div>

              <div>
                <Label>Email<span className="text-error-500">*</span></Label>
                <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="email@kampus.ac.id" />
              </div>

              <div>
                <Label>Password<span className="text-error-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                  />
                  <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                  </span>
                </div>
              </div>

              <div>
                <Label>Konfirmasi Password<span className="text-error-500">*</span></Label>
                <Input type={showPassword ? "text" : "password"} value={confirm} onChange={(e: any) => setConfirm(e.target.value)} placeholder="Ulangi password" />
              </div>

              {/* INPUT FILES */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label>Foto KTP (jelas)*</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdCard(e.target.files?.[0] || null)}
                    className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-white/5 dark:file:text-white/90 dark:hover:file:bg-white/10"
                  />
                </div>
                <div>
                  <Label>Foto KTM (jelas)*</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setStudentCard(e.target.files?.[0] || null)}
                    className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-white/5 dark:file:text-white/90 dark:hover:file:bg-white/10"
                  />
                </div>
              </div>

              <div>
                <Label>Foto Wajah (jelas)*</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFacePhoto(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-white/5 dark:file:text-white/90 dark:hover:file:bg-white/10"
                />
              </div>

              <div className="flex items-center gap-3">
                <Checkbox className="w-5 h-5" checked={isChecked} onChange={setIsChecked} />
                <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                  Dengan mendaftar, kamu setuju dengan <span className="text-gray-800 dark:text-white/90">Syarat & Ketentuan</span> serta <span className="text-gray-800 dark:text-white">Kebijakan Privasi</span>.
                </p>
              </div>

              {msg && <div className="text-sm text-error-500">{msg}</div>}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
                >
                  {loading ? "Processing..." : "Sign Up"}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Setelah mendaftar, akun driver kamu berstatus <b>Pending</b> menunggu verifikasi admin.
              </p>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Sudah punya akun?
              <Link to="/signin" className="ml-1 text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
