import type { Lot } from "./domain";

/**
 * Modelul de creștere (docs/plan-platforma.md §1b): pui pășunați în țarcuri mobile de 4 × 3 m,
 * 40 de pui / țarc, ~170 m² de pășune / țarc (mutat zilnic, refacere în 14 zile).
 */
export const GROWTH = {
  birdsPerPen: 40,
  pastureM2PerPen: 170,
  /** Țarcurile aceluiași lot pornesc la cel mult 7 zile după primul (pui de vârste apropiate). */
  penStartWindowDays: 7,
  growthDays: 60,
  indoorDays: 21,
  /** Refacerea pășunii și igienizarea după sacrificare, până la lotul următor (decizia fondatorului, 28.11.2026). */
  turnaroundDays: 14,
} as const;

export const pensForArea = (m2: number) => Math.max(0, Math.floor(m2 / GROWTH.pastureM2PerPen));
export const lotPens = (lot: Lot) => lot.pens ?? Math.max(1, Math.ceil(lot.totalBirds / GROWTH.birdsPerPen));

const day = 86_400_000;
const at = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();

export type PenState = "pornit" | "plin" | "se-umple" | "gol" | "inchis";

/** Starea fiecărui țarc: câți pui are rezervați și dacă a pornit. */
export function penView(lot: Lot, now = new Date()) {
  const pens = lotPens(lot);
  const starts = lot.penStarts ?? [];
  const windowOpen = penWindowOpen(lot, now);
  return Array.from({ length: pens }, (_, i) => {
    const n = i + 1;
    const birds = Math.max(0, Math.min(GROWTH.birdsPerPen, lot.reservedBirds - i * GROWTH.birdsPerPen));
    const start = starts.find((s) => s.n === n);
    const state: PenState = start ? "pornit" : !windowOpen ? "inchis" : birds >= GROWTH.birdsPerPen ? "plin" : birds > 0 ? "se-umple" : "gol";
    return { n, birds, state, date: start?.date };
  });
}

export const penStateLabels: Record<PenState, string> = {
  pornit: "Pornit",
  plin: "Plin – gata de pornire",
  "se-umple": "Se umple",
  gol: "Liber",
  inchis: "Închis (fereastra de 7 zile a trecut)",
};

/** Fereastra de pornire: înainte de primul țarc sau în 7 zile de la el. */
export function penWindowOpen(lot: Lot, now = new Date()) {
  const first = (lot.penStarts ?? [])[0];
  if (!first) return true;
  return now.getTime() <= at(first.date) + GROWTH.penStartWindowDays * day + day - 1;
}

/** Locurile care mai pot primi precomenzi: doar în țarcurile care încă pot porni. */
export function sellableBirds(lot: Lot, now = new Date()) {
  const free = Math.max(0, lot.totalBirds - lot.reservedBirds);
  return penWindowOpen(lot, now) ? free : 0;
}

/** Sfârșitul ocupării gospodăriei de către lot (creștere + pauză). */
export function lotBusyUntil(lot: Lot) {
  return new Date(at(lot.startDate) + (lot.growthDays + GROWTH.turnaroundDays) * day);
}

/** Un lot pe rând: eroarea dacă noul lot s-ar suprapune cu altul al gospodăriei. */
export function overlapError(lots: Lot[], startDate: string, exceptCode?: string) {
  const s = at(startDate);
  for (const l of lots) {
    if (l.code === exceptCode || l.approval?.status === "respins") continue;
    const ls = at(l.startDate);
    const le = lotBusyUntil(l).getTime();
    const ne = s + (GROWTH.growthDays + GROWTH.turnaroundDays) * day;
    if (s < le && ls < ne) {
      return `Gospodăria crește un singur lot pe rând: lotul ${l.code} ocupă gospodăria până la ${new Date(le).toLocaleDateString("ro-RO")}. Alege o dată după aceasta.`;
    }
  }
  return "";
}
