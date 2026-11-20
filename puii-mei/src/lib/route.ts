import type { GeoPoint } from "./domain";

/** Distanța în linie dreaptă, în km. */
export function haversineKm(a: GeoPoint, b: GeoPoint) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Estimare pe drum de munte: factor de ocolire 1,4 și viteză medie 40 km/h. */
export const roadKm = (a: GeoPoint, b: GeoPoint) => haversineKm(a, b) * 1.4;
export const driveMinutes = (km: number) => (km / 40) * 60;
/** Timp petrecut la fiecare oprire (predare, verificări, semnătură). */
export const STOP_MINUTES = 10;

function totalKm(start: GeoPoint, pts: GeoPoint[], order: number[]) {
  let km = 0;
  let prev = start;
  for (const i of order) {
    km += roadKm(prev, pts[i]);
    prev = pts[i];
  }
  return km;
}

/**
 * Ordinea optimă a opririlor (fără întoarcere la start): cel mai apropiat vecin,
 * îmbunătățit cu 2-opt. Suficient pentru turele mici ale unei gospodării; pentru
 * distanțe reale pe drum se poate folosi ulterior un serviciu de rutare.
 */
export function optimizeOrder(start: GeoPoint, pts: GeoPoint[]): number[] {
  const n = pts.length;
  if (n <= 1) return pts.map((_, i) => i);
  const left = new Set(pts.map((_, i) => i));
  const order: number[] = [];
  let cur = start;
  while (left.size) {
    let best = -1;
    let bestD = Infinity;
    for (const i of left) {
      const d = roadKm(cur, pts[i]);
      if (d < bestD) [best, bestD] = [i, d];
    }
    order.push(best);
    left.delete(best);
    cur = pts[best];
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (totalKm(start, pts, candidate) + 1e-9 < totalKm(start, pts, order)) {
          order.splice(0, n, ...candidate);
          improved = true;
        }
      }
    }
  }
  return order;
}

/** Ore estimate de sosire, pornind de la ora plecării. */
export function estimateTimes(start: GeoPoint, pts: GeoPoint[], departure: Date) {
  let t = departure.getTime();
  let prev = start;
  return pts.map((p) => {
    const km = roadKm(prev, p);
    t += driveMinutes(km) * 60_000;
    const eta = new Date(t);
    t += STOP_MINUTES * 60_000;
    prev = p;
    return { km, eta };
  });
}

/** Link de navigație Google Maps (gratuit, fără cheie), cu opririle în ordine. */
export function googleMapsRoute(start: GeoPoint, pts: GeoPoint[]) {
  if (!pts.length) return null;
  const f = (p: GeoPoint) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const dest = pts[pts.length - 1];
  const waypoints = pts.slice(0, -1).map(f).join("|");
  const params = new URLSearchParams({ api: "1", origin: f(start), destination: f(dest), travelmode: "driving" });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
