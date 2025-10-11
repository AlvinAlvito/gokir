import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router"; // atau "react-router-dom" sesuai setupmu
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

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // --- Init Google Identity Services & render button ---
  useEffect(() => {
    if (!window.google || !googleBtnRef.current || !GOOGLE_CLIENT_ID) return;

    const cb = async (response: any) => {
      // response.credential = ID token (JWT)
      try {
        setLoading(true);
        setMsg(null);
        const r = await fetch(`${API_URL}/auth/customer/login-google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken: response.credential }),
        });
        const json = await r.json();
        if (!r.ok || !json.ok) throw new Error(json?.error?.message || "Google sign-in failed");
        // success → arahkan ke dashboard customer
        navigate("/dashboard/customer");
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

    // Render button Google ke dalam div kita
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "left",
      width: 360,
    });

    // (Opsional) tampilkan One Tap
    // window.google.accounts.id.prompt();
  }, []);

  // --- Submit: Email Register ---
  const onSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChecked) {
      setMsg("Silakan setujui Terms & Privacy terlebih dahulu.");
      return;
    }
    if (!email || !password || !firstName) {
      setMsg("First name, email, dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      setMsg(null);
      const name = `${firstName}${lastName ? " " + lastName : ""}`;
      const r = await fetch(`${API_URL}/auth/customer/register-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) throw new Error(json?.error?.message || "Register gagal");
      // berhasil → langsung login (cookie sudah diset oleh backend)
      navigate("/dashboard/customer/profile-setup"); // arahin ke langkah lengkapi profil
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
              Daftar Customer
            </h1>
          </div>

          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
              {/* Google Sign-In Button container */}
              <div
                ref={googleBtnRef}
                className="sm:col-span-2 inline-flex items-center justify-center py-1"
                aria-label="Sign in with Google"
              />
            </div>

            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                  atau daftar dengan email
                </span>
              </div>
            </div>

            <form onSubmit={onSubmitRegister}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* First Name */}
                  <div className="sm:col-span-1">
                    <Label>
                      First Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e: any) => setFirstName(e.target.value)}
                      
                    />
                  </div>
                  {/* Last Name */}
                  <div className="sm:col-span-1">
                    <Label>Last Name</Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e: any) => setLastName(e.target.value)}
                    />
                  </div>
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
                    placeholder="Enter your email"
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
                      placeholder="Enter your password"
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
                {msg && (
                  <div className="text-sm text-error-500">
                    {msg}
                  </div>
                )}

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
