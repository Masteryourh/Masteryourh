"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/domain";

const pinIcon = `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#1b3424" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="#e8bd55"/></svg>`;

/**
 * Hartă cu pin mutabil (OpenStreetMap). Clientul atinge harta sau trage pinul;
 * poate căuta adresa sau folosi locația curentă.
 */
export function MapPicker({
  center,
  value,
  onChange,
  address,
}: {
  center: GeoPoint;
  value: GeoPoint | null;
  onChange: (p: GeoPoint) => void;
  address: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current || map.current) return;
      const start = value ?? center;
      const m = L.map(box.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], value ? 17 : 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      const icon = L.divIcon({ html: pinIcon, className: "", iconSize: [32, 42], iconAnchor: [16, 41] });
      const place = (lat: number, lng: number) => {
        if (!marker.current) {
          marker.current = L.marker([lat, lng], { draggable: true, icon }).addTo(m);
          marker.current.on("dragend", () => {
            const p = marker.current!.getLatLng();
            onChangeRef.current({ lat: p.lat, lng: p.lng });
          });
        } else marker.current.setLatLng([lat, lng]);
        onChangeRef.current({ lat, lng });
      };
      if (value) place(value.lat, value.lng);
      m.on("click", (e) => place(e.latlng.lat, e.latlng.lng));
      (box.current as HTMLDivElement & { _place?: typeof place })._place = place;
      map.current = m;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fără pin: centrează pe zona aleasă.
  useEffect(() => {
    if (map.current && !marker.current) map.current.setView([center.lat, center.lng], 13);
  }, [center.lat, center.lng]);

  const place = (lat: number, lng: number) => {
    (box.current as (HTMLDivElement & { _place?: (a: number, b: number) => void }) | null)?._place?.(lat, lng);
    map.current?.setView([lat, lng], 17);
  };

  async function searchAddress() {
    if (address.trim().length < 3) {
      setStatus("Scrie întâi adresa în câmpul de mai sus.");
      return;
    }
    setStatus("Caut adresa…");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ro&accept-language=ro&q=${encodeURIComponent(address)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (!data.length) {
        setStatus("N-am găsit adresa. Mută pinul manual pe casa ta.");
        return;
      }
      place(Number(data[0].lat), Number(data[0].lon));
      setStatus("Am pus pinul aproximativ. Verifică și mută-l exact pe poartă sau pe casă.");
    } catch {
      setStatus("Căutarea nu a funcționat. Mută pinul manual pe hartă.");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus("Telefonul nu permite localizarea.");
      return;
    }
    setStatus("Caut locația ta…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place(pos.coords.latitude, pos.coords.longitude);
        setStatus("Pinul e pe locația ta. Mută-l dacă e nevoie.");
      },
      () => setStatus("Nu am primit acces la locație. Mută pinul manual pe hartă."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={searchAddress} className="rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white">
          Caută adresa pe hartă
        </button>
        <button type="button" onClick={useMyLocation} className="rounded-full px-4 py-2 text-sm font-semibold text-forest-800 ring-1 ring-forest-900/15">
          Folosește locația mea
        </button>
      </div>
      <div ref={box} className="relative z-0 mt-3 h-72 w-full overflow-hidden rounded-2xl ring-1 ring-forest-900/15" aria-label="Hartă: atinge harta sau trage pinul pe locul livrării" />
      <p className="mt-2 text-sm text-muted" aria-live="polite">
        {status ?? (value ? "Pin pus. Îl poți trage ca să-l corectezi." : "Atinge harta ca să pui pinul pe locul exact al livrării.")}
      </p>
    </div>
  );
}
