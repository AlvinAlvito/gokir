import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import Badge from "../ui/badge/Badge";
import { Modal } from "../ui/modal";

const API_URL = import.meta.env.VITE_API_URL as string;

type StoreStatus = "PENDING" | "APPROVED" | "REJECTED";

type StoreItem = {
  id: string;
  storeName?: string | null;
  ownerName?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  description?: string | null;
  categories?: string | null;
  photoUrl?: string | null;
  status: StoreStatus;
  user?: {
    id: string;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    role: string;
    ticketBalance?: { balance: number } | null;
    storeAvailability?: {
      status: "ACTIVE" | "INACTIVE";
      region: string | null;
      locationUrl?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      note?: string | null;
      openDays?: string | null;
      openTime?: string | null;
      closeTime?: string | null;
      updatedAt?: string;
    } | null;
  } | null;
};

export default function StoreList() {
  const [data, setData] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<StoreItem | null>(null);
  const itemsPerPage = 6;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/stores`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || "Gagal fetch store");
      setData(json?.data ?? json);
    } catch (err) {
      console.error("Gagal fetch data store:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter(d =>
      (d.storeName ?? "").toLowerCase().includes(q) ||
      (d.ownerName ?? "").toLowerCase().includes(q) ||
      (d.user?.username ?? "").toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, data]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleRefresh = () => { fetchData(); };

  const buildImageUrl = (rel?: string | null) => {
    if (!rel) return "/images/user/user-01.jpg";
    if (/^https?:\/\//i.test(rel)) return rel;
    return `${API_URL}${rel.startsWith("/") ? "" : "/"}${rel}`;
  };

  const approve = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stores/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || "Gagal approve");
      setData(prev => prev.map(x => (x.id === id ? { ...x, status: "APPROVED" } : x)));
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah status (approve)");
    }
  };

  const reject = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/stores/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || "Gagal reject");
      setData(prev => prev.map(x => (x.id === id ? { ...x, status: "REJECTED" } : x)));
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah status (reject)");
    }
  };

  if (loading) return <p>Memuat data toko...</p>;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Daftar Toko
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              <RotateCcw className="w-4 h-4" /> Refresh
            </button>
            <div className=" lg:block">
              <form>
                <div className="relative">
                  <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
                    <svg
                      className="fill-gray-500 dark:fill-gray-400"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                        fill=""
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nama toko / pemilik / username…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((store) => (
            <div
              key={store.id}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 flex flex-col justify-between"
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={buildImageUrl(store.photoUrl)}
                  alt={store.storeName ?? "Store"}
                  className="w-14 h-14 rounded-xl object-cover"
                />
                <div>
                  <p className="font-medium text-gray-800 dark:text-white/90">
                    {store.storeName ?? "—"}
                  </p>
                  <p className="text-gray-500 text-sm dark:text-gray-400">
                    Pemilik: {store.ownerName ?? "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <span className="font-medium text-gray-700 dark:text-white">
                    WhatsApp:<br />
                  </span>
                  {store.user?.phone ? (
                    <a
                      className="text-brand-500 hover:underline"
                      href={`https://wa.me/${store.user.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {store.user.phone}
                    </a>
                  ) : "—"}
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-white">
                    Alamat:<br />
                  </span>
                  {store.address ?? "—"}
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-white">
                    Status{" "}
                  </span>
                  <Badge
                    size="sm"
                    color={store.status === "APPROVED" ? "success" : store.status === "REJECTED" ? "error" : "warning"}
                  >
                    {store.status === "PENDING" ? "Menunggu Verifikasi" : store.status === "APPROVED" ? "Aktif" : "Ditolak"}
                  </Badge>
                </p>
                <p>
                  <span className="font-medium text-gray-700 dark:text-white">
                    Tiket:
                  </span>{" "}
                  {store.user?.ticketBalance?.balance ?? 0}
                </p>
              </div>

              {/* Aksi */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelected(store)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
                >
                  Profil
                </button>

                {store.status !== "APPROVED" && (
                  <button
                    onClick={() => approve(store.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                  >
                    Setujui
                  </button>
                )}
                {store.status !== "REJECTED" && (
                  <button
                    onClick={() => reject(store.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700"
                  >
                    Tolak
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 dark:text-gray-200"
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-3 py-1 rounded border border-gray-300 dark:border-gray-700 ${
                  currentPage === pageNum ? "bg-gray-200 dark:bg-gray-700" : ""
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 dark:text-gray-200"
          >
            Next
          </button>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} className="max-w-4xl m-4">
        <div className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Profil Toko</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Detail User & StoreProfile</p>
            </div>
          </div>

          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 p-4 space-y-2">
                <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">User</h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">ID: {selected.user?.id || "—"}</p>
                <p className="text-sm text-gray-800 dark:text-white/90">Username: {selected.user?.username || "—"}</p>
                <p className="text-sm text-gray-800 dark:text-white/90">Email: {selected.user?.email || "—"}</p>
                <p className="text-sm text-gray-800 dark:text-white/90">Phone: {selected.user?.phone || "—"}</p>
                <p className="text-sm text-gray-800 dark:text-white/90">Role: {selected.user?.role || "—"}</p>
                <p className="text-sm text-gray-800 dark:text-white/90">Tiket: {selected.user?.ticketBalance?.balance ?? 0}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 p-4 space-y-3">
                <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Profil Toko</h5>
                <div className="flex items-center gap-3">
                  <img
                    src={buildImageUrl(selected.photoUrl)}
                    alt={selected.storeName || "Store"}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="text-sm text-gray-700 dark:text-white/90 space-y-1">
                    <div className="font-semibold">{selected.storeName || "—"}</div>
                    <div>Pemilik: {selected.ownerName || "—"}</div>
                    <div>
                      Status:{" "}
                      <Badge
                        variant="light"
                        color={
                          selected.status === "APPROVED"
                            ? "success"
                            : selected.status === "PENDING"
                            ? "warning"
                            : "error"
                        }
                      >
                        {selected.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-white/90 space-y-1">
                  <div>Alamat: {selected.address || "—"}</div>
                  <div>Maps: {selected.mapsUrl ? <a className="text-brand-500 hover:underline" href={selected.mapsUrl} target="_blank" rel="noreferrer">Lihat</a> : "—"}</div>
                  <div>Deskripsi: {selected.description || "—"}</div>
                  <div>Kategori: {selected.categories || "—"}</div>
                  <div className="pt-2 space-y-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Ketersediaan</div>
                    <AvailabilityInfo store={selected} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function AvailabilityInfo({ store }: { store: StoreItem }) {
  const av = store.user?.storeAvailability;
  if (!av) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Ketersediaan belum diatur.
      </div>
    );
  }
  const balance = store.user?.ticketBalance?.balance ?? 0;
  const approved = store.status === "APPROVED";
  const effectiveStatus = !approved || balance <= 0 ? "INACTIVE" : av.status;
  const note =
    !approved
      ? "Profil belum disetujui"
      : balance <= 0
      ? "Saldo tiket habis"
      : null;
  return (
    <div className="space-y-1 text-sm text-gray-700 dark:text-white/90">
      <div>Status: {effectiveStatus === "ACTIVE" ? "Aktif" : "Tidak Aktif"} {note ? `(${note})` : ""}</div>
      <div>Wilayah: {av.region || "—"}</div>
      <div>Link Maps: {av.locationUrl ? <a href={av.locationUrl} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">Buka Maps</a> : "—"}</div>
      <div>Koordinat: {av.latitude != null && av.longitude != null ? `${av.latitude}, ${av.longitude}` : "—"}</div>
      <div>Catatan: {av.note || "—"}</div>
      <div>Hari Buka: {av.openDays || "—"}</div>
      <div>Jam: {(av.openTime || "--:--")} - {(av.closeTime || "--:--")}</div>
      <div>Diperbarui: {av.updatedAt ? new Date(av.updatedAt).toLocaleString() : "—"}</div>
    </div>
  );
}
