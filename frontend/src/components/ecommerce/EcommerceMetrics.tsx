import { useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, GroupIcon, UserIcon, BoxIconLine } from "../../icons";
import Badge from "../ui/badge/Badge";

type RoleKey = "DRIVER" | "CUSTOMER" | "STORE";

type StatsResponse = {
  ok: boolean;
  data?: {
    counts: Record<RoleKey, number>;
    weeklyChange: Record<RoleKey, number | null>;
  };
  error?: { message: string };
};

const API_URL = import.meta.env.VITE_API_URL as string;

const roleMeta: Record<RoleKey, { label: string; Icon: any }> = {
  DRIVER: { label: "Total Driver", Icon: UserIcon },
  CUSTOMER: { label: "Total Customer", Icon: GroupIcon },
  STORE: { label: "Total Store", Icon: BoxIconLine },
};

type Props = { compact?: boolean };

export default function EcommerceMetrics({ compact = false }: Props) {
  const [counts, setCounts] = useState<Partial<Record<RoleKey, number>>>({});
  const [changes, setChanges] = useState<Partial<Record<RoleKey, number | null>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/stats/users`, { credentials: "include" });
        const json = (await res.json()) as StatsResponse;
        if (res.ok && json.ok && json.data && mounted) {
          setCounts(json.data.counts);
          setChanges(json.data.weeklyChange);
        }
      } catch (e) {
        // abaikan, biarkan tetap loading false
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const items = useMemo(() => {
    return (["DRIVER", "CUSTOMER", "STORE"] as RoleKey[]).map((key) => ({
      key,
      label: roleMeta[key].label,
      Icon: roleMeta[key].Icon,
      value: counts[key] ?? 0,
      change: changes[key] ?? null,
    }));
  }, [counts, changes]);

  const formatChange = (val: number | null) => {
    if (val === null || Number.isNaN(val)) return { text: "—", color: "secondary", icon: null };
    const icon = val >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />;
    const color = val >= 0 ? "success" : "error";
    return { text: `${val.toFixed(2)}%`, color, icon };
  };

  if (compact) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Statistik Pengguna</h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">7 hari terakhir</span>
        </div>
        <div className="space-y-3">
          {items.map(({ key, label, Icon, value, change }) => {
            const { text, color, icon } = formatChange(change);
            return (
              <div key={key} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Icon className="text-gray-800 size-5 dark:text-white/90" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-base font-semibold text-gray-800 dark:text-white/90">{loading ? "..." : value?.toLocaleString()}</p>
                  </div>
                </div>
                <Badge color={color as any} size="sm">
                  {icon}
                  {text}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6">
      {items.map(({ key, label, Icon, value, change }) => {
        const { text, color, icon } = formatChange(change);
        return (
          <div key={key} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <Icon className="text-gray-800 size-6 dark:text-white/90" />
            </div>

            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {loading ? "..." : value?.toLocaleString()}
                </h4>
              </div>
              <Badge color={color as any}>
                {icon}
                {text}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
