// src/components/admin/ProfilDriver.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import Badge from "../ui/badge/Badge";

const API_URL = import.meta.env.VITE_API_URL as string;

type DriverStatus = "PENDING" | "APPROVED" | "REJECTED";

type UserLite = {
  id: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
};

type ReviewerLite = {
  id: string;
  username?: string | null;
  email?: string | null;
};

type DriverDetail = {
  id: string;
  name?: string | null;
  nim?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null; // akan kita format
  idCardUrl?: string | null;
  studentCardUrl?: string | null;
  facePhotoUrl?: string | null;
  status: DriverStatus;
  createdAt: string;
  user: UserLite;
  reviewedBy?: ReviewerLite | null;
};

function buildImageUrl(rel?: string | null) {
  if (!rel) return "/images/user/owner.jpg";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
}

function formatDate(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(); // bisa disesuaikan locale
}

function statusColor(s: DriverStatus) {
  return s === "APPROVED" ? "success" : s === "REJECTED" ? "error" : "warning";
}

export default function AdminDriverProfil() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<DriverDetail | null>(null);

  const avatarSrc = useMemo(() => buildImageUrl(data?.facePhotoUrl), [data?.facePhotoUrl]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        setMsg(null);
        const r = await fetch(`${API_URL}/admin/drivers/${id}`, { credentials: "include" });
        const j = await r.json();
        if (!r.ok || j?.ok === false) throw new Error(j?.error?.message || "Gagal memuat profil driver");
        setData(j?.data ?? j);
      } catch (e: any) {
        setMsg(e.message || "Gagal memuat profil driver");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const badge = useMemo(() => {
    const s = data?.status || "PENDING";
    const base = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium";
    if (s === "APPROVED")
      return { text: "Aktif", klass: `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400` };
    if (s === "REJECTED")
      return { text: "Ditolak", klass: `${base} bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400` };
    return { text: "Menunggu Verifikasi", klass: `${base} bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400` };
  }, [data?.status]);

  if (loading) return <p>Memuat detail driver…</p>;
  if (msg) return <p className="text-error-500">{msg}</p>;
  if (!data) return <p>Data tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      {/* Header card (tetap pakai gaya template) */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            {/* Avatar */}
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
              <img src={avatarSrc} alt="Driver" className="h-full w-full object-cover object-center" />
            </div>

            {/* Info ringkas */}
            <div className="order-3 xl:order-2">
              <div className="flex items-center justify-center xl:justify-start gap-3 mb-1">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {data.name ?? "—"}
                </h4>
                <span className={badge.klass}>
                  <span className="inline-block h-2 w-2 rounded-full bg-current opacity-60" />
                  {badge.text}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">NIM {data.nim ?? "—"}</p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">WA {data.whatsapp ?? "—"}</p>
              </div>

              {data.address && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center xl:text-left">
                  {data.address}
                </div>
              )}
            </div>

            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end" />
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/driver/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              Kembali
            </Link>
          </div>
        </div>
      </div>

      {/* Grid dua kolom: Info Akun & Profil Driver */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Info Akun (User) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h5 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Info Akun (User)</h5>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-gray-500 dark:text-gray-400">User ID</dt><dd className="text-gray-800 dark:text-white/90">{data.user?.id}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Username</dt><dd className="text-gray-800 dark:text-white/90">{data.user?.username ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="text-gray-800 dark:text-white/90">{data.user?.email ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">No. HP</dt><dd className="text-gray-800 dark:text-white/90">{data.user?.phone ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Role</dt><dd><Badge size="sm" >{data.user?.role}</Badge></dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Dibuat</dt><dd className="text-gray-800 dark:text-white/90">{formatDate(data.createdAt)}</dd></div>
          </dl>
        </div>

        {/* Profil Driver */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h5 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Profil Driver</h5>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-gray-500 dark:text-gray-400">Nama</dt><dd className="text-gray-800 dark:text-white/90">{data.name ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">NIM</dt><dd className="text-gray-800 dark:text-white/90">{data.nim ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">WA</dt><dd className="text-gray-800 dark:text-white/90">{data.whatsapp ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Alamat</dt><dd className="text-gray-800 dark:text-white/90">{data.address ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Tempat Lahir</dt><dd className="text-gray-800 dark:text-white/90">{data.birthPlace ?? "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Tanggal Lahir</dt><dd className="text-gray-800 dark:text-white/90">{formatDate(data.birthDate)}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">KTP</dt><dd className="text-gray-800 dark:text-white/90">{data.idCardUrl ? <a className="text-brand-600 underline" href={buildImageUrl(data.idCardUrl)} target="_blank">Lihat</a> : "—"}</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">KTM</dt><dd className="text-gray-800 dark:text-white/90">{data.studentCardUrl ? <a className="text-brand-600 underline" href={buildImageUrl(data.studentCardUrl)} target="_blank">Lihat</a> : "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><Badge size="sm" color={statusColor(data.status)}>{data.status === "PENDING" ? "Menunggu Verifikasi" : data.status === "APPROVED" ? "Aktif" : "Ditolak"}</Badge></dd></div>
            <div className="sm:col-span-2"><dt className="text-gray-500 dark:text-gray-400">Reviewer</dt><dd className="text-gray-800 dark:text-white/90">{data.reviewedBy ? `${data.reviewedBy.username ?? data.reviewedBy.email ?? data.reviewedBy.id}` : "—"}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
