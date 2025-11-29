import { Link } from "react-router";
import Button from "../components/ui/button/Button";

const features = [
  { title: "Transportasi Cepat", desc: "Driver terlatih dan tersebar di berbagai wilayah kampus.", icon: "??" },
  { title: "Antar Makanan", desc: "Pesan makanan dari toko sistem maupun toko luar dengan mudah.", icon: "??" },
  { title: "Pembayaran Fleksibel", desc: "Dukungan cash dan QRIS, aman serta transparan.", icon: "??" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white">
      <header className="w-full border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo/logo.png" alt="Gokir" className="h-10 w-auto" />
            <div className="text-left">
              <p className="text-lg font-semibold leading-none">GOKIR</p>
              <p className="text-xs text-white/70">Transportasi & Pengantaran</p>
            </div>
          </Link>
          <div className="hidden gap-4 text-sm font-medium text-white/80 md:flex">
            <a href="#layanan" className="hover:text-white">Layanan</a>
            <a href="#fitur" className="hover:text-white">Fitur</a>
            <a href="#mulai" className="hover:text-white">Cara Mulai</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/signin" className="text-sm font-medium text-white/80 hover:text-white">Masuk</Link>
            <Button size="sm" onClick={() => window.location.href = "/signup-option"}>Daftar</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-14 text-center md:flex-row md:text-left md:py-20">
          <div className="flex-1 space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              Transportasi kampus • Delivery makanan • COD & QRIS
            </span>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Gokir, solusi antar jemput & pesan makanan untuk mahasiswa.
            </h1>
            <p className="max-w-xl text-base text-white/80 sm:text-lg">
              Satu aplikasi untuk perjalanan cepat, pengantaran makanan, dan transaksi aman. Driver terverifikasi, toko terkurasi, harga transparan.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={() => window.location.href = "/signin"}>Mulai sekarang</Button>
              <Link to="/orders/ride" className="text-sm font-semibold text-emerald-200 hover:text-white">Lihat layanan &rarr;</Link>
            </div>
            <div className="flex flex-wrap gap-6 text-left text-sm text-white/70">
              <div>
                <p className="text-xl font-bold text-white">3000+</p>
                <p>Order per bulan</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">4.8/5</p>
                <p>Rating driver & store</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">24/7</p>
                <p>Dukungan & CS</p>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6 shadow-[0_20px_70px_-30px_rgba(16,185,129,0.7)]">
              <div className="space-y-3 text-left">
                <p className="text-sm text-emerald-100">Simulasi rute</p>
                <div className="h-64 rounded-2xl bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.25),rgba(15,23,42,0)),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.15),rgba(15,23,42,0)),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(6,78,59,0.6))] border border-white/5 p-4 text-white">
                  <p className="text-lg font-semibold">Kampus UINSU Sutomo ? Jalan Pelita</p>
                  <p className="text-sm text-white/70">Estimasi 1.2 km • ±8 menit • Rp6.000</p>
                  <div className="mt-4 h-40 rounded-xl bg-black/20 flex items-center justify-center text-sm text-white/60 border border-white/5">
                    Preview rute akan tampil di aplikasi
                  </div>
                </div>
                <p className="text-xs text-white/60">Harga dinamis mengikuti jarak, wilayah, dan metode pembayaran.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="bg-white text-slate-900 py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 space-y-8">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold text-emerald-600">KENAPA GOKIR</p>
              <h2 className="text-3xl font-bold">Fitur yang bikin nyaman</h2>
              <p className="text-sm text-slate-600 max-w-2xl mx-auto">
                Semua kebutuhan transportasi dan pengantaran di satu tempat. Aman, cepat, dan transparan.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition">
                  <div className="mb-3 h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-600 mt-2">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="mulai" className="py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-emerald-400">UNTUK DRIVER & STORE</p>
              <h2 className="text-3xl font-bold">Gabung dan mulai hasilkan pendapatan tambahan.</h2>
              <p className="text-sm text-white/80 max-w-xl">
                Daftarkan diri sebagai driver atau toko. Kami sediakan sistem tiket, wilayah operasi, serta laporan transaksi untuk menjaga kualitas layanan.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" onClick={() => window.location.href = "/signup-driver"}>Daftar jadi driver</Button>
                <Button size="sm" variant="outline" onClick={() => window.location.href = "/signup-store"}>Daftar toko</Button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                <div>
                  <p className="text-xs text-white/60">Total Driver</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
                <span className="text-xs text-emerald-300 font-semibold">100%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                <div>
                  <p className="text-xs text-white/60">Total Customer</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
                <span className="text-xs text-emerald-300 font-semibold">100%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                <div>
                  <p className="text-xs text-white/60">Total Store</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
                <span className="text-xs text-emerald-300 font-semibold">100%</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/80 py-10">
        <div className="mx-auto max-w-6xl px-4 grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <img src="/images/logo/logo.png" alt="Gokir" className="h-10 w-auto" />
            <p className="text-sm text-white/70">Transportasi online dan pengantaran makanan untuk kampus dan sekitarnya.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-2">Menu</p>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <Link to="/orders/ride" className="hover:text-white">Antar Penumpang</Link>
              <Link to="/orders/food" className="hover:text-white">Pesan Makanan</Link>
              <Link to="/cart" className="hover:text-white">Keranjang</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-2">Gabung</p>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <Link to="/signup-driver" className="hover:text-white">Daftar Driver</Link>
              <Link to="/signup-store" className="hover:text-white">Daftar Toko</Link>
              <Link to="/tutorial-support/customer" className="hover:text-white">Pusat Bantuan</Link>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-white/60">© {new Date().getFullYear()} Gokir. All rights reserved.</div>
      </footer>
    </div>
  );
}
