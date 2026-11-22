"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

const COLORS = ["#b9841a", "#3f6b4d", "#2f5d8a", "#9b3d6b", "#5b3f8a", "#8a5b2f", "#2f8a7d", "#8a2f2f"];

/**
 * Traseul țarcurilor pe pășune: fiecare mutare notată (poziția GPS), pe culori pe țarc;
 * ultimul punct al fiecărui țarc = poziția actuală.
 */
export function PenTrackMap({ tracks, height = "h-72" }: { tracks: { pen: number; points: { lat: number; lng: number; date: string }[] }[]; height?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!box.current) return;
      const all = tracks.flatMap((t) => t.points);
      if (!all.length) return;
      map = L.map(box.current, { scrollWheelZoom: false });
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: "Imagini satelit &copy; Esri",
      }).addTo(map);
      for (const t of tracks) {
        const color = COLORS[(t.pen - 1) % COLORS.length];
        const pts = t.points.map((p) => [p.lat, p.lng] as [number, number]);
        if (pts.length > 1) L.polyline(pts, { color, weight: 3, opacity: 0.8 }).addTo(map);
        t.points.forEach((p, i) => {
          const last = i === t.points.length - 1;
          L.circleMarker([p.lat, p.lng], { radius: last ? 9 : 4, color: "#fff", weight: last ? 3 : 1, fillColor: color, fillOpacity: 1 })
            .bindTooltip(`Țarcul ${t.pen} · ${p.date}${last ? " (acum)" : ""}`)
            .addTo(map!);
        });
      }
      map.fitBounds(L.latLngBounds(all.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 19 });
    })();
    return () => {
      map?.remove();
    };
  }, [tracks]);
  if (!tracks.some((t) => t.points.length)) {
    return <div className={`flex ${height} items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500`}>Încă nicio mutare cu poziție GPS.</div>;
  }
  return <div ref={box} className={`relative z-0 ${height} w-full overflow-hidden rounded-2xl ring-1 ring-slate-200`} aria-label="Traseul țarcurilor pe pășune" />;
}
