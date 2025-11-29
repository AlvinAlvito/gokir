import { useEffect, useState } from "react";

type Coord = { lat: number; lng: number };

type Props = {
  pickupUrl?: string | null;
  dropoffUrl?: string | null;
  pickupCoord?: Coord | null;
  dropoffCoord?: Coord | null;
};

const parseLatLngFromUrl = (url?: string | null): Coord | null => {
  if (!url) return null;
  const q = url.match(/q=([0-9.+-]+),([0-9.+-]+)/i);
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };
  const at = url.match(/@([0-9.+-]+),([0-9.+-]+)/i);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };
  return null;
};

// decode OSRM polyline (Google encoded polyline)
const decodePolyline = (str: string, precision = 5): [number, number][] => {
  let index = 0;
  const coordinates: [number, number][] = [];
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
};

export default function RideRoutePreview({ pickupUrl, dropoffUrl, pickupCoord: pickupProp, dropoffCoord: dropoffProp }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [directionsUrl, setDirectionsUrl] = useState<string | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapId] = useState(() => `ride-map-${Math.random().toString(36).slice(2, 8)}`);
  const [routeCoords, setRouteCoords] = useState<Coord[] | null>(null);

  let p = pickupProp || parseLatLngFromUrl(pickupUrl);
  let d = dropoffProp || parseLatLngFromUrl(dropoffUrl);

  useEffect(() => {
    if (!p && !d) {
      setError("Koordinat tidak valid");
      setDirectionsUrl(null);
      return;
    }
    if (p && !d) {
      // fallback: use slight offset for end to allow map render
      d = { lat: p.lat + 0.0005, lng: p.lng + 0.0005 };
    }
    if (d && !p) {
      p = { lat: d.lat + 0.0005, lng: d.lng + 0.0005 };
    }
    setError(null);
    setDirectionsUrl(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${p.lat}%2C${p.lng}%3B${d.lat}%2C${d.lng}#map=15/${((p.lat + d.lat) / 2).toFixed(6)}/${((p.lng + d.lng) / 2).toFixed(6)}`);

    const fetchOsrm = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${p.lng},${p.lat};${d.lng},${d.lat}?overview=full&geometries=polyline`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data?.code === "Ok" && data?.routes?.[0]?.geometry) {
          const coords = decodePolyline(data.routes[0].geometry).map(([lat, lng]) => ({ lat, lng }));
          setRouteCoords(coords);
        } else {
          setRouteCoords(null);
        }
      } catch {
        setRouteCoords(null);
      }
    };
    fetchOsrm();
  }, [p?.lat, p?.lng, d?.lat, d?.lng]);

  useEffect(() => {
    if (!p || !d) return;
    const ensureLeaflet = async () => {
      if (typeof window === "undefined") return;
      if ((window as any).L) {
        setLeafletReady(true);
        return;
      }
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setLeafletReady(true);
      script.onerror = () => setLeafletReady(false);
      document.body.appendChild(script);
    };
    ensureLeaflet();
  }, [p?.lat, p?.lng, d?.lat, d?.lng]);

  useEffect(() => {
    if (!leafletReady || !p || !d) return;
    const L = (window as any).L;
    if (!L) return;
    const container = document.getElementById(mapId);
    if (!container) return;
    // clear previous map instance if any
    container.innerHTML = "";
    const center = [(p.lat + d.lat) / 2, (p.lng + d.lng) / 2];
    const map = L.map(container, { center, zoom: 15, zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    const startIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      shadowSize: [41, 41],
    });
    const endIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      shadowSize: [41, 41],
      className: "leaflet-marker-red",
    });
    const start = L.marker([p.lat, p.lng], { icon: startIcon }).addTo(map).bindTooltip("Titik awal", { permanent: true, direction: "top", offset: [0, -10], className: "osm-label-start" });
    const end = L.marker([d.lat, d.lng], { icon: endIcon }).addTo(map).bindTooltip("Titik tujuan", { permanent: true, direction: "top", offset: [0, -10], className: "osm-label-end" });
    if (routeCoords && routeCoords.length > 1) {
      const poly = L.polyline(routeCoords.map((c) => [c.lat, c.lng]), { color: "#2563eb", weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    } else {
      L.polyline([[p.lat, p.lng], [d.lat, d.lng]], { color: "#2563eb", weight: 4, opacity: 0.8 }).addTo(map);
      map.fitBounds(L.latLngBounds([start.getLatLng(), end.getLatLng()]), { padding: [30, 30] });
    }
    return () => {
      map.remove();
    };
  }, [leafletReady, mapId, p?.lat, p?.lng, d?.lat, d?.lng, routeCoords]);

  if (error) return <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>;
  if (!p || !d) return null;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden relative z-0">
      <div id={mapId} style={{ height: 260, width: "100%", position: "relative", zIndex: 0 }} />
      <style>
        {`#${mapId} .leaflet-pane,
#${mapId} .leaflet-top,
#${mapId} .leaflet-bottom { z-index: 0 !important; }`}
      </style>
      {directionsUrl && (
        <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50/70 dark:bg-black/20">
          <span>Buka rute di OpenStreetMap</span>
          <a className="text-brand-600 hover:underline" href={directionsUrl} target="_blank" rel="noreferrer">Lihat rute</a>
        </div>
      )}
    </div>
  );
}
