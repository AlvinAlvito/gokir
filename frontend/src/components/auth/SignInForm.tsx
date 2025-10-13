import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext"; // ⬅️ tambahkan

const API_URL = import.meta.env.VITE_API_URL as string;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

declare global { interface Window { google?: any; } }

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [keepLogin, setKeepLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState(""); // email ATAU username
  const [password, setPassword] = useState("");

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { refresh } = useAuth(); // ⬅️ ambil refresh dari AuthContext

  // Google Sign-In → default ke CUSTOMER
  useEffect(() => {
    if (!window.google || !googleBtnRef.current || !GOOGLE_CLIENT_ID) return;

    googleBtnRef.current.innerHTML = "";

    const cb = async (response: any) => {
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

        // ⬇️ sinkronkan sesi ke AuthContext
        await refresh();

        // default: customer dashboard
        navigate("/dashboard/customer", { replace: true });
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
  }, [refresh]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!identifier || !password) {
      setMsg("Email/username dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          keepLogin, // opsional, kalau backend support remember me
        }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) throw new Error(json?.error?.message || "Login gagal");

      // ⬇️ penting: update AuthContext dari /auth/session
      await refresh();

      const role = json.data.user.role as "CUSTOMER" | "STORE" | "DRIVER" | "ADMIN" | "SUPERADMIN";
      switch (role) {
        case "CUSTOMER":
          navigate("/dashboard/customer", { replace: true });
          break;
        case "STORE":
          navigate("/dashboard/store", { replace: true });
          break;
        case "DRIVER":
          navigate("/dashboard/driver", { replace: true });
          break;
        case "ADMIN":
        case "SUPERADMIN":
          navigate("/dashboard/admin", { replace: true });
          break;
        default:
          navigate("/", { replace: true });
      }
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <img width={141} height={28} src="/images/logo/logo.png" alt="Logo" className="object-contain" />
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <div className="flex items-center justify-start gap-3 mb-4">
              <h1 className="font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Login
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Masuk dengan email <em>atau</em> username + password. (Google khusus Customer)
            </p>
          </div>

          <div>
            {/* Google button (Customer) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
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
                  atau
                </span>
              </div>
            </div>

            <form onSubmit={onSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email atau Username <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    placeholder="contoh: c1@example.com / superadmin"
                    value={identifier}
                    onChange={(e: any) => setIdentifier(e.target.value)}
                  />
                </div>

                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={keepLogin} onChange={setKeepLogin} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div>

                {msg && <div className="text-sm text-error-500">{msg}</div>}

                <div>
                  <Button type="submit" className="w-full" size="sm" disabled={loading}>
                    {loading ? "Processing..." : "Sign in"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Belum punya akun?{" "}
                <Link to="/signup-option" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
