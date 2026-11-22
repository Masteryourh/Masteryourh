import type { Lot } from "./domain";
import { GROWTH } from "./growth";

/** Ce notează gospodarul în jurnalul de creștere (transparență totală). */
export type GrowthEntryType = "mutare" | "hranire" | "apa" | "tratament" | "curatenie" | "mortalitate" | "poza" | "veterinar" | "altele";

export const growthEntryLabels: Record<GrowthEntryType, string> = {
  mutare: "Mutarea țarcului",
  hranire: "Hrănire",
  apa: "Apă",
  tratament: "Tratament / vaccin",
  curatenie: "Curățenie",
  mortalitate: "Pierderi (pui morți)",
  poza: "Poza săptămânii",
  veterinar: "Verificare veterinară",
  altele: "Altă intervenție",
};

export interface GrowthEntry {
  id: string;
  lotCode: string;
  farmSlug: string;
  /** Țarcul (1…n); lipsă = tot lotul. */
  pen?: number;
  type: GrowthEntryType;
  /** Ziua la care se referă (AAAA-LL-ZZ). */
  date: string;
  /** Momentul înregistrării. */
  at: string;
  note: string;
  /** Pentru pierderi: câți pui. */
  count?: number;
  /** Poziția (la mutarea țarcului: locul nou de pe pășune). */
  lat?: number;
  lng?: number;
  photoId?: string;
  vetName?: string;
  by: string;
}

const DAY = 86_400_000;
const d = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
const today = (now: Date) => now.toISOString().slice(0, 10);

/** Ziua de viață a puilor din țarc (de la pornire). */
export const penAgeDays = (startDate: string, now = new Date()) => Math.floor((d(today(now)) - d(startDate)) / DAY);

export interface GrowthAlert {
  id: string;
  lotCode: string;
  farmSlug: string;
  pen?: number;
  kind: "mutare" | "poza";
  text: string;
}

/**
 * Alertele de monitorizare pentru loturile în creștere:
 * - țarcul de pe pășune (de la ziua 21) nemutat ieri sau azi;
 * - lipsa pozei săptămânale (la fiecare 7 zile de la pornirea primului țarc).
 */
export function growthAlerts(lots: Lot[], entries: GrowthEntry[], now = new Date()): GrowthAlert[] {
  const alerts: GrowthAlert[] = [];
  for (const lot of lots) {
    const starts = lot.penStarts ?? [];
    if (!starts.length) continue;
    const mine = entries.filter((e) => e.lotCode === lot.code);
    const lotAge = penAgeDays(starts[0].date, now);
    if (lotAge < 0 || lotAge >= lot.growthDays) continue;

    for (const s of starts) {
      const age = penAgeDays(s.date, now);
      if (age <= GROWTH.indoorDays || age >= lot.growthDays) continue;
      const last = mine.filter((e) => e.type === "mutare" && e.pen === s.n).map((e) => e.date).sort().at(-1);
      // Prima mutare e datorată de a doua zi pe pășune; apoi zilnic (alertă dacă lipsește și ieri).
      const since = last ? penAgeDays(last, now) : age - GROWTH.indoorDays;
      if (since >= 2) {
        alerts.push({
          id: `mutare:${lot.code}:${s.n}`,
          lotCode: lot.code,
          farmSlug: lot.farmSlug,
          pen: s.n,
          kind: "mutare",
          text: last ? `Țarcul ${s.n} nu a mai fost mutat din ${last} (${since} zile).` : `Țarcul ${s.n} e pe pășune de ${since} zile și nu are nicio mutare notată.`,
        });
      }
    }

    const lastPhoto = mine.filter((e) => e.type === "poza").map((e) => e.date).sort().at(-1);
    const sincePhoto = penAgeDays(lastPhoto ?? starts[0].date, now);
    if (sincePhoto > 7) {
      alerts.push({
        id: `poza:${lot.code}`,
        lotCode: lot.code,
        farmSlug: lot.farmSlug,
        kind: "poza",
        text: lastPhoto ? `Poza săptămânii lipsește: ultima e din ${lastPhoto} (${sincePhoto} zile).` : `Poza săptămânii lipsește (lotul are ${sincePhoto} zile).`,
      });
    }
  }
  return alerts;
}
