import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";

type Role = "CUSTOMER" | "DRIVER" | "STORE";

type Item = {
  id?: string;
  role: Role;
  whatsappLink?: string | null;
  youtubeUrl?: string | null;
  tips?: string | null;
  warning?: string | null;
  terms?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL as string;

const defaultItem: Item = { role: "CUSTOMER", whatsappLink: "", youtubeUrl: "", tips: "", warning: "", terms: "" };

export default function SuperadminTutorialSupportPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<Item>(defaultItem);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API_URL}/superadmin/tutorial-support`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat data");
      setItems(j.data.items || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.role) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const r = await fetch(`${API_URL}/superadmin/tutorial-support`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          whatsappLink: form.whatsappLink || undefined,
          youtubeUrl: form.youtubeUrl || undefined,
          tips: form.tips || undefined,
          warning: form.warning || undefined,
          terms: form.terms || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal menyimpan");
      setSuccess("Data tersimpan");
      setForm(defaultItem);
      load();
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Tutorial & Support" description="Kelola materi tutorial per role" />
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tutorial & Support</h2>
          <p className="text-sm text-gray-500">Kelola link WA, video, dan tips per role.</p>
        </div>

        {error && <div className="text-sm text-amber-600">{error}</div>}
        {success && <div className="text-sm text-emerald-600">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <label className="text-sm text-gray-700 dark:text-white/80">Role</label>
            <div className="flex gap-2">
              {(["CUSTOMER", "DRIVER", "STORE"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setForm((p) => ({ ...p, role: r }))}
                  className={`px-3 py-1 rounded-lg border text-sm ${form.role === r ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"}`}
                >
                  {r.toLowerCase()}
                </button>
              ))}
            </div>

            <LabelInput label="Link grup WhatsApp">
              <Input value={form.whatsappLink || ""} onChange={(e: any) => setForm((p) => ({ ...p, whatsappLink: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
            </LabelInput>
            <LabelInput label="Link video YouTube">
              <Input value={form.youtubeUrl || ""} onChange={(e: any) => setForm((p) => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
            </LabelInput>
            <LabelInput label="Tips & trik">
              <TextArea rows={3} value={form.tips || ""} onChange={(val: string) => setForm((p) => ({ ...p, tips: val }))} />
            </LabelInput>
            <LabelInput label="Pesan peringatan">
              <TextArea rows={2} value={form.warning || ""} onChange={(val: string) => setForm((p) => ({ ...p, warning: val }))} />
            </LabelInput>
            <LabelInput label="Syarat & ketentuan">
              <TextArea rows={3} value={form.terms || ""} onChange={(val: string) => setForm((p) => ({ ...p, terms: val }))} />
            </LabelInput>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button variant="outline" onClick={() => setForm(defaultItem)}>Reset</Button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-white/90">Data tersimpan</p>
            {loading && <p className="text-xs text-gray-500">Memuat...</p>}
            {!loading && items.length === 0 && <p className="text-xs text-gray-500">Belum ada data.</p>}
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.role} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1 text-sm">
                  <p className="font-semibold">{it.role.toLowerCase()}</p>
                  {it.whatsappLink && <a className="text-brand-500 text-xs block break-all" href={it.whatsappLink} target="_blank" rel="noreferrer">WA: {it.whatsappLink}</a>}
                  {it.youtubeUrl && <a className="text-brand-500 text-xs block break-all" href={it.youtubeUrl} target="_blank" rel="noreferrer">YouTube: {it.youtubeUrl}</a>}
                  {it.tips && <p className="text-xs text-gray-600 dark:text-gray-300">Tips: {it.tips}</p>}
                  {it.warning && <p className="text-xs text-amber-600">Peringatan: {it.warning}</p>}
                  {it.terms && <p className="text-xs text-gray-600 dark:text-gray-300">S&K: {it.terms}</p>}
                  <Button size="sm" variant="outline" onClick={() => setForm({ ...it })}>Edit</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LabelInput({ label, children }: { label: string; children: any }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-700 dark:text-white/80">{label}</label>
      {children}
    </div>
  );
}
