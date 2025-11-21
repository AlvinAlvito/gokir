import { useEffect, useMemo, useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Select from "../form/Select";
import Input from "../form/input/InputField";

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

type UserOption = { id: string; label: string; role: string };
type GrantTx = {
  id: string;
  user: { id: string; username?: string | null; email?: string | null; role: string };
  amount: number;
  description?: string | null;
  createdAt: string;
};

export default function AdminTickets() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [grants, setGrants] = useState<GrantTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [showGrant, setShowGrant] = useState(false);
  const [targetRole, setTargetRole] = useState<"DRIVER" | "STORE">("DRIVER");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState(3);
  const [password, setPassword] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const [rOrders, rGrants] = await Promise.all([
        fetch(`${API_URL}/admin/tickets/orders`, { credentials: "include" }),
        fetch(`${API_URL}/admin/tickets/grants`, { credentials: "include" }),
      ]);
      const jOrders = await rOrders.json();
      const jGrants = await rGrants.json();
      if (!rOrders.ok || !jOrders?.ok) throw new Error(jOrders?.error?.message || "Gagal memuat order");
      if (!rGrants.ok || !jGrants?.ok) throw new Error(jGrants?.error?.message || "Gagal memuat riwayat grant");
      setOrders(jOrders.data.orders || []);
      setGrants(jGrants.data.transactions || []);
    } catch (e: any) {
      setMsg(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async (role: "DRIVER" | "STORE") => {
    try {
      const r = await fetch(`${API_URL}/admin/tickets/recipients?role=${role}`, { credentials: "include" });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal memuat penerima");
      const opts = (json.data.users || []).map((u: any) => ({
        id: u.id,
        role: u.role,
        label: `${u.username || u.email || u.id} (${u.role})`,
      }));
      setUsers(opts);
      setSelectedUserId(opts[0]?.id || "");
    } catch (e: any) {
      setMsg(e.message || "Gagal memuat penerima");
    }
  };

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { fetchRecipients(targetRole); }, [targetRole]);

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

  const handleGrant = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedUserId || amount <= 0 || !password) {
      setMsg("Lengkapi penerima, jumlah, dan password.");
      return;
    }
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/admin/tickets/grant`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, amount, password }),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal grant tiket");
      setMsg(`Berhasil kirim ${amount} tiket ke user`);
      setAmount(3);
      setPassword("");
      setShowGrant(false);
      fetchOrders();
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const userOptions = useMemo(
    () => users.map((u) => ({ label: u.label, value: u.id })),
    [users]
  );

  return (
    <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Kelola Tiket (Admin/Superadmin)</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchOrders} disabled={loading}>Refresh</Button>
          <Button size="sm" onClick={() => setShowGrant(true)}>Kirim Tiket</Button>
        </div>
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

      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Riwayat Grant Manual</h4>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 uppercase border-b border-gray-100 dark:border-gray-800">
                <th className="py-2 pr-3">Waktu</th>
                <th className="py-2 pr-3">Penerima</th>
                <th className="py-2 pr-3">Jumlah</th>
                <th className="py-2 pr-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {grants.length === 0 ? (
                <tr><td className="py-3 text-gray-500 dark:text-gray-400" colSpan={4}>Belum ada grant manual.</td></tr>
              ) : grants.map((g) => {
                const profileLink = g.user.role === "DRIVER" ? `/admin/drivers/${g.user.id}` : "#";
                return (
                  <tr key={g.id}>
                    <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(g.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      <a
                        className="text-brand-500 hover:underline"
                        href={profileLink}
                        target={profileLink === "#" ? "_self" : "_blank"}
                        rel="noreferrer"
                      >
                        {g.user.username || g.user.email || g.user.id}
                      </a>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{g.user.role}</div>
                    </td>
                    <td className="py-2 pr-3 font-semibold text-emerald-600">+{g.amount}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400">{g.description || "Grant manual"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showGrant} onClose={() => setShowGrant(false)} className="max-w-xl m-4">
        <div className="p-5 space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Kirim/Grant Tiket Manual</h4>
          <form className="space-y-3" onSubmit={handleGrant}>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Target Role</label>
              <Select
                options={[
                  { label: "Driver", value: "DRIVER" },
                  { label: "Store", value: "STORE" },
                ]}
                defaultValue={targetRole}
                onChange={(v: string) => {
                  setTargetRole(v as any);
                  setSelectedUserId("");
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Penerima</label>
              <Select
                options={userOptions}
                defaultValue={selectedUserId}
                onChange={(v: string) => setSelectedUserId(v)}
                placeholder={`Pilih ${targetRole.toLowerCase()}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Jumlah tiket</label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e: any) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Password Superadmin</label>
              <Input
                type="password"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowGrant(false)}>Batal</Button>
              <Button size="sm" type="submit" disabled={loading}>Kirim</Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Grant manual tanpa payment (untuk pembelian luar sistem).</p>
          </form>
          {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
        </div>
      </Modal>
    </div>
  );
}
