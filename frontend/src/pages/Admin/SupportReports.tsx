import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";

const API_URL = import.meta.env.VITE_API_URL as string;

const statusOptions = [
  { value: "PENDING", label: "Menunggu" },
  { value: "IN_PROGRESS", label: "Diproses" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "RESOLVED", label: "Selesai" },
];

type UserLite = { id: string; username?: string | null; email?: string | null; phone?: string | null };
type Report = {
  id: string;
  orderId: string;
  category: string;
  status: string;
  detail: string;
  proofUrl?: string | null;
  createdAt: string;
  reporter?: UserLite | null;
  order?: {
    customer?: UserLite | null;
    driver?: UserLite | null;
    store?: UserLite | null;
  } | null;
};

export default function SupportReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState("");

  const fetchReports = async (pageToFetch = 1) => {
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/superadmin/reports?page=${pageToFetch}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat laporan");
      const data = j.data || {};
      const list = data.reports || [];
      setReports(list);
      setPage(data.page || pageToFetch);
      setHasNext(list.length === (data.perPage || list.length));
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(page); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`${API_URL}/superadmin/reports/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal mengubah status");
      setReports((prev) => prev.map((rep) => (rep.id === id ? { ...rep, status } : rep)));
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan saat ubah status");
    }
  };

  const formatName = (u?: UserLite | null) => u?.username || "-";
  const formatContact = (u?: UserLite | null) => [u?.email, u?.phone].filter(Boolean).join(" · ") || "-";
  const statusBadge = (value: string) => {
    const color =
      value === "PENDING" ? "warning" :
      value === "IN_PROGRESS" ? "primary" :
      value === "REJECTED" ? "error" :
      "success";
    const label = statusOptions.find((s) => s.value === value)?.label || value;
    return <Badge size="sm" color={color as any}>{label}</Badge>;
  };

  const filtered = reports.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const candidate = [
      r.id,
      r.orderId,
      r.category,
      r.status,
      r.detail,
      formatName(r.reporter),
      formatContact(r.reporter),
      formatName(r.order?.driver),
      formatContact(r.order?.driver),
      formatName(r.order?.store),
      formatContact(r.order?.store),
    ].join(" ").toLowerCase();
    return candidate.includes(q);
  });

  return (
    <>
      <PageMeta title="Laporan Support" description="Daftar laporan transaksi" />
      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Laporan Support</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fetchReports(page)} disabled={loading}>Refresh</Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari laporan, transaksi, pelapor..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-3">ID Laporan</th>
                <th className="py-2 pr-3">ID Transaksi</th>
                <th className="py-2 pr-3">Kategori</th>
                <th className="py-2 pr-3">Pelapor</th>
                <th className="py-2 pr-3">Detail</th>
                <th className="py-2 pr-3">Driver</th>
                <th className="py-2 pr-3">Store</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((r) => {
                const reporter = r.reporter;
                return (
                  <tr key={r.id} className="text-gray-800 dark:text-white/90">
                    <td className="py-2 pr-3 align-top">{r.id}</td>
                    <td className="py-2 pr-3 align-top">{r.orderId}</td>
                    <td className="py-2 pr-3 align-top capitalize">{r.category?.toLowerCase()}</td>
                    <td className="py-2 pr-3 align-top">
                      <p className="font-semibold">{formatName(reporter)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatContact(reporter)}</p>
                    </td>
                    <td className="py-2 pr-3 align-top max-w-xs whitespace-pre-line text-gray-700 dark:text-gray-200">{r.detail}</td>
                    <td className="py-2 pr-3 align-top">
                      <p className="font-semibold">{formatName(r.order?.driver)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatContact(r.order?.driver)}</p>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <p className="font-semibold">{formatName(r.order?.store)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatContact(r.order?.store)}</p>
                    </td>
                    <td className="py-2 pr-3 align-top">{statusBadge(r.status)}</td>
                    <td className="py-2 pr-3 align-top">
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                      >
                        {statusOptions.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={9} className="py-4 text-center text-gray-500 dark:text-gray-400">Belum ada laporan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="outline" onClick={() => fetchReports(Math.max(1, page - 1))} disabled={page <= 1 || loading}>Sebelumnya</Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">Halaman {page}</p>
          <Button size="sm" variant="outline" onClick={() => fetchReports(page + 1)} disabled={!hasNext || loading}>Berikutnya</Button>
        </div>
      </div>
    </>
  );
}
