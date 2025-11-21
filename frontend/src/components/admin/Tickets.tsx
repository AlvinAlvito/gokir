import { useEffect, useState } from "react";
import Button from "../ui/button/Button";

const API_URL = import.meta.env.VITE_API_URL as string;

type Order = {
  id: string;
  user: { id: string; username?: string | null; email?: string | null; role: string };
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod: string;
  paymentPayload?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

export default function AdminTickets() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/admin/tickets/orders`, { credentials: "include" });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal memuat order");
      setOrders(json.data.orders || []);
    } catch (e: any) {
      setMsg(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const markPaid = async (id: string) => {
    try {
      setLoading(true);
      const r = await fetch(`${API_URL}/admin/tickets/orders/${id}/mark-paid`, {
        method: "POST",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal set paid");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...json.data.order } : o)));
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Kelola Tiket (Admin/Superadmin)</h3>
        <Button size="sm" variant="outline" onClick={fetchOrders} disabled={loading}>Refresh</Button>
      </div>
      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 uppercase border-b border-gray-100 dark:border-gray-800">
              <th className="py-2 pr-3">Order</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Qty</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {orders.length === 0 ? (
              <tr><td className="py-3 text-gray-500 dark:text-gray-400" colSpan={6}>Belum ada order.</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="text-gray-800 dark:text-white/90">
                <td className="py-2 pr-3">
                  <div className="font-medium">#{o.id.slice(0, 8)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(o.createdAt).toLocaleString()}</div>
                </td>
                <td className="py-2 pr-3">
                  <div>{o.user.username || o.user.email || o.user.id}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{o.user.role}</div>
                </td>
                <td className="py-2 pr-3">{o.quantity}</td>
                <td className="py-2 pr-3">Rp{o.totalAmount}</td>
                <td className="py-2 pr-3">{o.status}</td>
                <td className="py-2 pr-3">
                  {o.status !== "PAID" ? (
                    <Button size="sm" onClick={() => markPaid(o.id)} disabled={loading}>Tandai Lunas</Button>
                  ) : (
                    <span className="text-xs text-emerald-600">Lunas</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
