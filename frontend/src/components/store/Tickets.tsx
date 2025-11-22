import { useEffect, useState } from "react";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";

const API_URL = import.meta.env.VITE_API_URL as string;
const MIN_QTY = 5;
const PRICE = 1000;

type Tx = {
  id: string;
  type: "GRANT_INITIAL" | "PURCHASE" | "CONSUME" | "ADJUST";
  amount: number;
  description?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

type Order = {
  id: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentPayload?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

export default function StoreTickets() {
  const [balance, setBalance] = useState(0);
  const [tx, setTx] = useState<Tx[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [qty, setQty] = useState(MIN_QTY);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const [r1, r2] = await Promise.all([
        fetch(`${API_URL}/store/tickets`, { credentials: "include" }),
        fetch(`${API_URL}/store/tickets/orders`, { credentials: "include" }),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (!r1.ok || !j1?.ok) throw new Error(j1?.error?.message || "Gagal muat saldo");
      if (!r2.ok || !j2?.ok) throw new Error(j2?.error?.message || "Gagal muat order");
      setBalance(j1.data.balance);
      setTx(j1.data.transactions || []);
      setOrders(j2.data.orders || []);
    } catch (e: any) {
      setMsg(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleOrder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (qty < MIN_QTY) {
      setMsg(`Minimal pembelian ${MIN_QTY} tiket`);
      return;
    }
    try {
      setLoading(true);
      setMsg(null);
      const r = await fetch(`${API_URL}/store/tickets/order`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal membuat order");
      setMsg("Order dibuat. Silakan lakukan pembayaran QRIS.");
      fetchAll();
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Tiket Saya</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Saldo tiket untuk transaksi store.</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">Saldo Tiket</p>
          <p className="text-3xl font-semibold text-gray-800 dark:text-white/90">{balance}</p>
        </div>
        <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">Beli Tiket</p>
          <form className="mt-2 flex flex-col md:flex-row md:items-end gap-3" onSubmit={handleOrder}>
            <div className="flex-1 space-y-1">
              <Label>Jumlah tiket (min {MIN_QTY})</Label>
              <Input type="number" value={qty} min={MIN_QTY} onChange={(e: any) => setQty(Number(e.target.value))} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total: Rp{(qty || 0) * PRICE}
              </p>
            </div>
            <Button type="submit" disabled={loading}>Buat Order QRIS</Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Transaksi Terakhir</h4>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {tx.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat.</p>
            ) : tx.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white/90">{t.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                  {t.description && <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>}
                </div>
                <div className={`font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-error-500"}`}>
                  {t.amount >= 0 ? "+" : ""}{t.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Order Pembelian</h4>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada order.</p>
            ) : orders.map((o) => (
              <div key={o.id} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                <p className="font-medium text-gray-800 dark:text-white/90">Order #{o.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {o.quantity} tiket • Rp{o.totalAmount} • {o.status}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(o.createdAt).toLocaleString()}</p>
                {o.status === "PENDING" && (
                  <div className="mt-1 text-xs text-gray-500">
                    QRIS Token: {o.paymentPayload || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
    </div>
  );
}
