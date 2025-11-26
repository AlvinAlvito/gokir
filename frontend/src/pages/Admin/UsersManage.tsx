import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";

const API_URL = import.meta.env.VITE_API_URL as string;

const roleOptions = [
  { value: "", label: "Semua" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "STORE", label: "Store" },
  { value: "DRIVER", label: "Driver" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

type User = {
  id: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  createdAt: string;
};

export default function UsersManagePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");

  const fetchUsers = async (pageToFetch = 1) => {
    try {
      setLoading(true);
      setMsg(null);
      const params = new URLSearchParams({ page: String(pageToFetch) });
      if (role) params.append("role", role);
      if (search.trim()) params.append("q", search.trim());
      const r = await fetch(`${API_URL}/superadmin/users?${params.toString()}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat pengguna");
      const data = j.data || {};
      const list = data.users || [];
      setUsers(list);
      setPage(data.page || pageToFetch);
      setHasNext(list.length === (data.perPage || list.length));
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(page); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => {
      const s = [u.id, u.username, u.email, u.phone, u.role].join(" ").toLowerCase();
      return s.includes(q);
    });
  }, [users, search]);

  const impersonate = async (id: string, role: string) => {
    try {
      const r = await fetch(`${API_URL}/superadmin/users/${id}/impersonate`, { method: "POST", credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal masuk sebagai user");
      // redirect sesuai role
      const path = role === "CUSTOMER" ? "/dashboard/customer" : role === "STORE" ? "/dashboard/store" : role === "DRIVER" ? "/dashboard/driver" : "/dashboard/admin";
      window.location.href = path;
    } catch (e: any) {
      setMsg(e.message || "Gagal masuk sebagai user");
    }
  };

  return (
    <>
      <PageMeta title="Manajemen Pengguna" description="Kelola seluruh user" />
      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Manajemen Pengguna</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Daftar seluruh pengguna sistem</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari id, nama, email, telp"
              className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
            <Button size="sm" variant="outline" onClick={() => fetchUsers(1)} disabled={loading}>Filter</Button>
            <Button size="sm" variant="outline" onClick={() => fetchUsers(page)} disabled={loading}>Refresh</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Kontak</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Waktu</th>
                <th className="py-2 pr-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((u) => (
                <tr key={u.id} className="text-gray-800 dark:text-white/90">
                  <td className="py-2 pr-3 align-top">{u.id}</td>
                  <td className="py-2 pr-3 align-top">{u.username || "-"}</td>
                  <td className="py-2 pr-3 align-top">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{[u.email, u.phone].filter(Boolean).join(" · ") || "-"}</p>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <Badge size="sm" color={u.role === "CUSTOMER" ? "primary" : u.role === "STORE" ? "info" : u.role === "DRIVER" ? "success" : "warning"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 align-top">{new Date(u.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-3 align-top space-x-2">
                    <Button size="sm" variant="outline" onClick={() => alert(`ID: ${u.id}\nNama: ${u.username || "-"}\nEmail: ${u.email || "-"}\nTelp: ${u.phone || "-"}\nRole: ${u.role}`)}>Detail</Button>
                    <Button size="sm" onClick={() => impersonate(u.id, u.role)}>Masuk</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="outline" onClick={() => fetchUsers(Math.max(1, page - 1))} disabled={page <= 1 || loading}>Sebelumnya</Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">Halaman {page}</p>
          <Button size="sm" variant="outline" onClick={() => fetchUsers(page + 1)} disabled={!hasNext || loading}>Berikutnya</Button>
        </div>
      </div>
    </>
  );
}
