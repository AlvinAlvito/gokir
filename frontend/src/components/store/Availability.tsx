import { useEffect, useMemo, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import Switch from "../form/switch/Switch";
import Badge from "../ui/badge/Badge";
import { PenBoxIcon, MapPin } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL as string;

type Status = "ACTIVE" | "INACTIVE";
type Region = "KAMPUS_SUTOMO" | "KAMPUS_TUNTUNGAN" | "KAMPUS_PANCING" | "WILAYAH_LAINNYA";

type Availability = {
  id: string;
  status: Status;
  region: Region;
  locationUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
  openDays?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  updatedAt?: string;
};

const statusOptions = [
  { label: "Aktif", value: "ACTIVE" },
  { label: "Tidak Aktif", value: "INACTIVE" },
] as const;

const regionOptions = [
  { label: "Kampus UINSU Sutomo", value: "KAMPUS_SUTOMO" },
  { label: "Kampus UINSU Tuntungan", value: "KAMPUS_TUNTUNGAN" },
  { label: "Kampus UINSU Pancing", value: "KAMPUS_PANCING" },
  { label: "Wilayah Lainnya", value: "WILAYAH_LAINNYA" },
] as const;

const dayOptions = [
  "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu",
];

export default function StoreAvailability() {
  const { isOpen, openModal, closeModal } = useModal();

  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [storeStatus, setStoreStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);

  const [status, setStatus] = useState<Status>("INACTIVE");
  const [region, setRegion] = useState<Region>("WILAYAH_LAINNYA");
  const [note, setNote] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [openDays, setOpenDays] = useState<string[]>([]);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");

  const hasLocation = useMemo(
    () => Boolean(mapsLink || (lat !== null && lng !== null)),
    [mapsLink, lat, lng]
  );

  const embedUrl = useMemo(() => {
    const defaultCoord = "3.600840,98.681326";
    const coordString = lat !== null && lng !== null ? `${lat},${lng}` : undefined;
    const base = mapsLink || coordString || defaultCoord;
    return `https://www.google.com/maps?q=${encodeURIComponent(base)}&hl=es;z=14&output=embed`;
  }, [mapsLink, lat, lng]);

  const resumoStatus = status === "ACTIVE"
    ? <Badge variant="light" color="success">Aktif</Badge>
    : <Badge variant="light" color="error">Tidak Aktif</Badge>;

  const fetchData = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const [rAvail, rTicket, rProfile] = await Promise.all([
        fetch(`${API_URL}/store/availability`, { credentials: "include" }),
        fetch(`${API_URL}/store/tickets`, { credentials: "include" }),
        fetch(`${API_URL}/store/profile/me`, { credentials: "include" }),
      ]);
      const jA = await rAvail.json();
      const jT = await rTicket.json();
      const jP = await rProfile.json();
      if (!rAvail.ok || !jA?.ok) throw new Error(jA?.error?.message || "Gagal memuat ketersediaan");
      if (!rTicket.ok || !jT?.ok) throw new Error(jT?.error?.message || "Gagal memuat saldo tiket");
      if (!rProfile.ok || !jP?.ok) throw new Error(jP?.error?.message || "Gagal memuat profil toko");
      const av: Availability = jA.data.availability;
      const bal = jT.data.balance ?? 0;
      const st = jA.data.storeStatus ?? jP?.data?.profile?.status ?? null;
      setBalance(bal);
      setStoreStatus(st);
      setData(av);
      const effectiveStatus = bal <= 0 || st !== "APPROVED" ? "INACTIVE" : av.status;
      setStatus(effectiveStatus);
      setRegion(av.region);
      setNote(av.note ?? "");
      setMapsLink(av.locationUrl ?? "");
      setLat(av.latitude ?? null);
      setLng(av.longitude ?? null);
      setOpenDays(av.openDays ? av.openDays.split(",").map(s => s.trim()).filter(Boolean) : []);
      setOpenTime(av.openTime ?? "");
      setCloseTime(av.closeTime ?? "");
    } catch (e: any) {
      setMsg(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Tangkap lokasi jika belum ada
  useEffect(() => {
    if (hasLocation) return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setMapsLink(`https://www.google.com/maps?q=${latitude},${longitude}`);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [hasLocation]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (balance <= 0) {
      setMsg("Saldo tiket habis. Tidak bisa mengubah ketersediaan.");
      return;
    }
    if (storeStatus !== "APPROVED") {
      setMsg("Profil toko belum disetujui. Tidak bisa mengubah ketersediaan.");
      return;
    }
    try {
      setLoading(true);
      setMsg(null);
      const payload: any = {
        status,
        region,
        note: note.trim() || null,
        openDays: openDays.join(","),
        openTime: openTime || null,
        closeTime: closeTime || null,
      };

      if (!data?.locationUrl && mapsLink) payload.locationUrl = mapsLink;
      if (data?.latitude == null && lat !== null) payload.latitude = lat;
      if (data?.longitude == null && lng !== null) payload.longitude = lng;

      const r = await fetch(`${API_URL}/store/availability`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.error?.message || "Gagal menyimpan");
      setMsg("Berhasil disimpan");
      const av: Availability = json.data.availability;
      setData(av);
      setStatus(av.status);
      setRegion(av.region);
      setNote(av.note ?? "");
      setMapsLink(av.locationUrl ?? mapsLink);
      setLat(av.latitude ?? lat);
      setLng(av.longitude ?? lng);
      setOpenDays(av.openDays ? av.openDays.split(",").map(s => s.trim()).filter(Boolean) : openDays);
      setOpenTime(av.openTime ?? openTime);
      setCloseTime(av.closeTime ?? closeTime);
      closeModal();
    } catch (e: any) {
      setMsg(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setOpenDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const disabledByStatus = balance <= 0 || storeStatus !== "APPROVED";
  const statusWarning = storeStatus !== "APPROVED"
    ? "Profil Anda belum disetujui. Ketersediaan dinonaktifkan."
    : balance <= 0
    ? "Saldo tiket habis. Beli tiket untuk mengaktifkan status."
    : null;

  return (
    <>
      <div className="p-5 rounded-3xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Ketersediaan Toko
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Atur status aktif, wilayah, jadwal buka, dan pantau lokasi.
            </p>
            {data?.updatedAt && (
              <p className="text-xs text-gray-400">Diperbarui: {new Date(data.updatedAt).toLocaleString()}</p>
            )}
          </div>
          <Button size="sm" onClick={openModal} className="flex items-center gap-2" disabled={disabledByStatus}>
            <PenBoxIcon size={16} />
            {disabledByStatus ? "Tidak bisa ubah" : "Update Ketersediaan"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:justify-between">
          <div className="grid grid-cols-2 gap-4 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Status</p>
              <div className="text-xl font-medium text-gray-800 dark:text-white/90">
                {resumoStatus}
              </div>
              <p className="text-xs text-gray-500 mt-1">Saldo tiket: {balance}</p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Wilayah</p>
              <p className="text-lg font-medium text-gray-800 dark:text-white/90">
                {regionOptions.find(r => r.value === region)?.label || "—"}
              </p>
            </div>
            <div className="lg:col-span-2">
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Catatan</p>
              <p className="text-sm font-normal text-gray-800 dark:text-white/90 min-h-[24px]">
                {note || "Tidak ada catatan"}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Hari Buka</p>
              <p className="text-sm text-gray-800 dark:text-white/90">
                {openDays.length ? openDays.join(", ") : "Belum diatur"}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Jam Buka/Tutup</p>
              <p className="text-sm text-gray-800 dark:text-white/90">
                {openTime || "--:--"} s/d {closeTime || "--:--"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="mb-1 text-xs leading-normal text-gray-500 dark:text-gray-400">Lokasi Toko di Google Maps</p>
            <div className="relative rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700" style={{ height: 220 }}>
              <iframe
                width="100%"
                height="220"
                loading="lazy"
                allowFullScreen
                className="rounded-xl pointer-events-none"
                src={embedUrl}
              ></iframe>
              <a
                href={mapsLink || embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10"
                style={{ cursor: "pointer" }}
              ></a>
            </div>
            <div className="px-4 py-2 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white/90 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-500" /> Koordinat: <span className="font-medium">{lat ?? "—"}, {lng ?? "—"}</span>
            </div>
          </div>
        </div>

        {(msg || statusWarning) && <div className="text-sm text-amber-600 dark:text-amber-400">{msg || statusWarning}</div>}
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[720px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-10 space-y-4 max-h-[90vh]">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Update Ketersediaan Toko</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ubah status, wilayah, jadwal buka, dan lokasi.</p>
          </div>

          <form className="grid grid-cols-1 lg:grid-cols-2 gap-6" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3">
                <Switch
                  label=""
                  defaultChecked={status === "ACTIVE"}
                  onChange={(checked) => setStatus(checked ? "ACTIVE" : "INACTIVE")}
                  color="blue"
                  key={`switch-${status}`}
                  disabled={disabledByStatus}
                />
                {status === "ACTIVE" ? (
                  <Badge variant="light" color="success">Aktif</Badge>
                ) : (
                  <Badge variant="light" color="error">Tidak Aktif</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Wilayah</Label>
                <Select
                  key={`region-${region}`}
                  options={regionOptions}
                  defaultValue={region}
                  onChange={(v: string) => setRegion(v as Region)}
                  placeholder="Pilih wilayah"
                  disabled={disabledByStatus}
                />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Hari Buka</Label>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((d) => {
                  const active = openDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      disabled={disabledByStatus}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${
                        active
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:border-brand-600 dark:text-brand-200"
                          : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Jam Buka</Label>
              <Input
                type="time"
                value={openTime}
                onChange={(e: any) => setOpenTime(e.target.value)}
                disabled={disabledByStatus}
              />
            </div>
            <div className="space-y-2">
              <Label>Jam Tutup</Label>
              <Input
                type="time"
                value={closeTime}
                onChange={(e: any) => setCloseTime(e.target.value)}
                disabled={disabledByStatus}
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Catatan (opsional)</Label>
              <Input value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Mis. toko tutup jika hujan lebat" />
            </div>

            <div className="space-y-2">
              <Label>Link Google Maps (auto)</Label>
              <Input value={mapsLink} disabled />
            </div>
            <div className="space-y-2">
              <Label>Koordinat</Label>
              <Input value={lat && lng ? `${lat}, ${lng}` : ""} disabled />
            </div>

            <div className="lg:col-span-2 flex items-center gap-3 justify-end pt-2">
              <Button size="sm" variant="outline" onClick={closeModal} type="button">Tutup</Button>
              <Button size="sm" type="submit" disabled={loading || disabledByStatus}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </div>
          </form>
          {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
        </div>
      </Modal>
    </>
  );
}
