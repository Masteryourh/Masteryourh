"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/domain";

const dot = (label: string, color: string) =>
  `<div style="background:${color};color:#fff;border:2px solid #fff;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font:600 12px system-ui;box-shadow:0 1px 4px rgba(0,0,0,.4)">${label}</div>`;

/** Harta turei: gospodăria (R) și opririle numerotate, cu traseul în ordine. */
export function TourMap({ start, stops }: { start: GeoPoint; stops: { point: GeoPoint; done: boolean }[] }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const pts: [number, number][] = [[start.lat, start.lng], ...stops.map((s) => [s.point.lat, s.point.lng] as [number, number])];
      L.marker(pts[0], { icon: L.divIcon({ html: dot("R", "#b9841a"), className: "", iconSize: [28, 28] }) }).addTo(map);
      stops.forEach((s, i) =>
        L.marker([s.point.lat, s.point.lng], {
          icon: L.divIcon({ html: dot(String(i + 1), s.done ? "#3f6b4d" : "#1b3424"), className: "", iconSize: [28, 28] }),
        }).addTo(map!),
      );
      L.polyline(pts, { color: "#1b3424", weight: 3, opacity: 0.6, dashArray: "6 6" }).addTo(map);
      map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 15 });
    })();
    return () => {
      map?.remove();
    };
  }, [start, stops]);
  return <div ref={box} className="relative z-0 h-72 w-full overflow-hidden rounded-2xl ring-1 ring-forest-900/15" aria-label="Harta turei" />;
}
