import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";

const API_URL = import.meta.env.VITE_API_URL as string;

type Order = {
  id: string;
  status: string;
  orderType: string;
  paymentMethod?: string | null;
  quantity?: number | null;
  createdAt: string;
  customer?: { username?: string | null; email?: string | null; phone?: string | null } | null;
  driver?: { username?: string | null; email?: string | null; phone?: string | null } | null;
  store?: { username?: string | null; email?: string | null; phone?: string | null; storeProfile?: { storeName?: string | null } | null } | null;
};

const statusBadge = (status: string) => {
  const map: Record<string, any> = {
    WAITING_STORE_CONFIRM: { color: "warning", label: "Menunggu konfirmasi toko" },
    REJECTED: { color: "error", label: "Ditolak" },
    CONFIRMED_COOKING: { color: "primary", label: "Diproses toko" },
    SEARCHING_DRIVER: { color: "info", label: "Mencari driver" },
    DRIVER_ASSIGNED: { color: "success", label: "Sudah diambil" },
    ON_DELIVERY: { color: "info", label: "Sedang diantar" },
    COMPLETED: { color: "success", label: "Selesai" },
    CANCELLED: { color: "error", label: "Dibatalkan" },
  };
  const data = map[status] || { color: "info", label: status };
  return <Badge size="sm" color={data.color}>{data.label}</Badge>;
};

export default function TransactionsMonitorPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState("");

  const fetchOrders = async (pageToFetch = 1, q = search) => {
    try {
      setLoading(true);
      setMsg(null);
      const params = new URLSearchParams({ page: String(pageToFetch) });
      if (q.trim()) params.append("q", q.trim());
      const r = await fetch(`${API_URL}/superadmin/orders?${params.toString()}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat transaksi");
      const data = j.data || {};
      const fetched = data.orders || [];
      setOrders(fetched);
      setPage(data.page || pageToFetch);
      setHasNext(fetched.length === (data.perPage || fetched.length));
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(page); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const s = [
        o.id,
        o.status,
        o.orderType,
        o.paymentMethod,
        o.customer?.username,
        o.customer?.email,
        o.customer?.phone,
        o.driver?.username,
        o.driver?.email,
        o.driver?.phone,
        o.store?.storeProfile?.storeName,
        o.store?.username,
        o.store?.email,
        o.store?.phone,
      ].join(" ").toLowerCase();
      return s.includes(q);
    });
  }, [orders, search]);

  const formatContact = (u?: { username?: string | null; email?: string | null; phone?: string | null } | null) =>
    [u?.email, u?.phone].filter(Boolean).join(" · ") || "-";

  return (
    <>
      <PageMeta title="Monitoring Transaksi" description="Pantau seluruh transaksi" />
      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Monitoring Transaksi</h2>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari transaksi, customer, driver, store..."
              className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
            <Button size="sm" variant="outline" onClick={() => fetchOrders(1, search)} disabled={loading}>Cari</Button>
            <Button size="sm" variant="outline" onClick={() => fetchOrders(page, search)} disabled={loading}>Refresh</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Jenis</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Driver</th>
                <th className="py-2 pr-3">Store</th>
                <th className="py-2 pr-3">Pembayaran</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((o) => (
                <tr key={o.id} className="text-gray-800 dark:text-white/90">
                  <td className="py-2 pr-3 align-top">{o.id}</td>
                  <td className="py-2 pr-3 align-top">{statusBadge(o.status)}</td>
                  <td className="py-2 pr-3 align-top">{o.orderType}</td>
                  <td className="py-2 pr-3 align-top">
                    <p className="font-semibold">{o.customer?.username || "-"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatContact(o.customer)}</p>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <p className="font-semibold">{o.driver?.username || "-"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatContact(o.driver)}</p>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <p className="font-semibold">{o.store?.storeProfile?.storeName || o.store?.username || "-"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatContact(o.store)}</p>
                  </td>
                  <td className="py-2 pr-3 align-top">{o.paymentMethod || "-"}</td>
                  <td className="py-2 pr-3 align-top">{o.quantity ?? "-"}</td>
                  <td className="py-2 pr-3 align-top">{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={9} className="py-4 text-center text-gray-500 dark:text-gray-400">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="outline" onClick={() => fetchOrders(Math.max(1, page - 1), search)} disabled={page <= 1 || loading}>Sebelumnya</Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">Halaman {page}</p>
          <Button size="sm" variant="outline" onClick={() => fetchOrders(page + 1, search)} disabled={!hasNext || loading}>Berikutnya</Button>
        </div>
      </div>
    </>
  );
}
