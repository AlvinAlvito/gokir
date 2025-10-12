import { Link } from "react-router";

export default function SignUpOption() {
  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <img
            width={141}
            height={28}
            src="/images/logo/logo.png"
            alt="Gokir"
            className="object-contain"
          />
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-col justify-center flex-1 w-full max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-semibold text-gray-800 text-title-sm sm:text-title-md dark:text-white/90">
            Kamu Mau Daftar Sebagai Apa?
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Pilih peranmu untuk lanjut ke halaman pendaftaran.
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Customer */}
          <Link
            to="/signup"
            className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-gray-900/60"
            aria-label="Daftar sebagai Customer"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/20">
                {/* icon bag/food */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M7 7V6a5 5 0 0110 0v1" />
                  <path d="M5 8h14l-1.2 11.2A2 2 0 0115.82 21H8.18a2 2 0 01-1.98-1.8L5 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  Customer
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Pesan makan & perjalanan di area kampus.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-brand-500/0 transition group-hover:ring-2" />
          </Link>

          {/* Driver */}
          <Link
            to="/signup-driver"
            className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-gray-900/60"
            aria-label="Daftar sebagai Driver"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
                {/* icon bike/helmet */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5 20a4 4 0 100-8 4 4 0 000 8zM19 20a4 4 0 100-8 4 4 0 000 8z" />
                  <path d="M5 16h5l3-7h4" />
                  <path d="M6 12l3 4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  Driver
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Daftar dengan KTP/KTM. Menunggu verifikasi admin.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-emerald-500/0 transition group-hover:ring-2" />
          </Link>

          {/* Store */}
          <Link
            to="/signup-store"
            className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-gray-900/60"
            aria-label="Daftar sebagai Store"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20">
                {/* icon store */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 10l1.5-6h15L21 10" />
                  <path d="M4 10h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" />
                  <path d="M9 14h6" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                  Store
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Buka toko, kelola menu, terima pesanan mahasiswa.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-amber-500/0 transition group-hover:ring-2" />
          </Link>
        </div>

        {/* Help / Note */}
        <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          Sudah punya akun?{" "}
          <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
