import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";

const API_URL = import.meta.env.VITE_API_URL as string;

type Region = "KAMPUS_SUTOMO" | "KAMPUS_TUNTUNGAN" | "KAMPUS_PANCING" | "WILAYAH_LAINNYA";

type StoreCard = {
  user: {
    id: string;
    phone?: string | null;
    storeProfile: {
      id: string;
      storeName?: string | null;
      ownerName?: string | null;
      address?: string | null;
      photoUrl?: string | null;
      description?: string | null;
    };
  };
  status: "ACTIVE" | "INACTIVE";
  region: Region;
};

const regionOptions = [
  { label: "Semua Wilayah", value: "" },
  { label: "Kampus UINSU Sutomo", value: "KAMPUS_SUTOMO" },
  { label: "Kampus UINSU Pancing", value: "KAMPUS_PANCING" },
  { label: "Kampus UINSU Tuntungan", value: "KAMPUS_TUNTUNGAN" },
  { label: "Wilayah Lainnya", value: "WILAYAH_LAINNYA" },
];

const toAbs = (rel?: string | null) => {
  if (!rel) return "/images/user/owner.jpg";
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
};

export default function OrdersFoodPage() {
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [region, setRegion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchStores = async (regionParam?: string) => {
    try {
      setLoading(true);
      setMsg(null);
      const url = new URL(`${API_URL}/customer/stores`);
      if (regionParam) url.searchParams.set("region", regionParam);
      const r = await fetch(url.toString(), { credentials: "include" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || "Gagal memuat toko");
      setStores(j.data.stores || []);
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStores(); }, []);

  const filtered = useMemo(() => stores, [stores]);

  return (
    <>
      <PageMeta title="Pesan Makanan" description="Pilih toko berdasarkan wilayah" />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pilih Toko</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Filter berdasarkan wilayah, lalu lihat menu.</p>
          </div>
          <div className="w-64">
            <Select
              options={regionOptions}
              defaultValue={region}
              onChange={(v: string) => { setRegion(v); fetchStores(v || undefined); }}
              placeholder="Pilih wilayah"
            />
          </div>
        </div>
        {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
        {loading ? (
          <p className="text-sm text-gray-500">Memuat...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <div key={s.user.storeProfile.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img src={toAbs(s.user.storeProfile.photoUrl)} alt={s.user.storeProfile.storeName || "Store"} className="w-14 h-14 object-cover rounded-xl border border-gray-200 dark:border-gray-800" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">{s.user.storeProfile.storeName || "Tanpa Nama"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.user.storeProfile.address || "Alamat tidak tersedia"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/90">
                  <Badge size="sm" color={s.status === "ACTIVE" ? "success" : "error"}>
                    {s.status === "ACTIVE" ? "Toko Aktif" : "Tidak Aktif"}
                  </Badge>
                  <span className="text-xs text-gray-500">{regionOptions.find(r => r.value === s.region)?.label || ""}</span>
                </div>
                <Button size="sm" onClick={() => navigate(`/orders/food/${s.user.storeProfile.id}`)}>
                  Lihat Menu
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
