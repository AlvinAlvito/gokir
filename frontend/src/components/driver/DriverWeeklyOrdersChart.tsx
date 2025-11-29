import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { MoreDotIcon } from "../../icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

const API_URL = import.meta.env.VITE_API_URL as string;

type DriverOrder = { createdAt: string };

type OrdersResponse = {
  ok?: boolean;
  data?: { orders?: DriverOrder[] };
  orders?: DriverOrder[];
};

export default function DriverWeeklyOrdersChart() {
  const [categories, setCategories] = useState<string[]>([]);
  const [seriesData, setSeriesData] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/driver/orders`, { credentials: "include" });
        const json: OrdersResponse = await res.json();
        const list = json?.data?.orders || json?.orders || [];
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 6); // last 7 days including today
        const counts = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const label = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
          counts.set(label, 0);
        }
        list.forEach((order) => {
          const d = new Date(order.createdAt);
          if (d >= start && d <= now) {
            const label = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
            if (counts.has(label)) counts.set(label, (counts.get(label) || 0) + 1);
          }
        });
        setCategories(Array.from(counts.keys()));
        setSeriesData(Array.from(counts.values()));
      } catch (e) {
        console.error("Gagal memuat statistik order driver", e);
      }
    };
    fetchData();
  }, []);

  const options: ApexOptions = useMemo(() => ({
    colors: ["#465fff"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 200, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%", borderRadius: 6, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
    legend: { show: false },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (val: number) => `${val} order` } },
  }), [categories]);

  const series = useMemo(() => [{ name: "Order", data: seriesData }], [seriesData]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Statistik 7 Hari Terakhir</h3>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={() => setIsOpen((p) => !p)}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
            <DropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">
              Refresh otomatis
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[520px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="bar" height={200} />
        </div>
      </div>
    </div>
  );
}
