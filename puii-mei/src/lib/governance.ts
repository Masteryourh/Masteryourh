import type { Lot } from "./domain";
import { GROWTH, overlapError, pensForArea } from "./growth";

/** Limitele implicite (vânzare directă, sacrificare în gospodărie). Adminul le poate schimba pe gospodărie. */
export const DEFAULT_LIMITS = {
  /** Ordinul ANSVSA 6/2024: carne de pasăre sacrificată la fermă, din cel mult 10.000 de capete / an. */
  birdsPerYear: 10_000,
  /** Plafon pe lot, peste capacitatea dată de suprafață (recomandare Puii mei). */
  birdsPerLot: 300,
} as const;

export type FarmStanding = "activa" | "avertizata" | "suspendata" | "exclusa";

export const standingLabels: Record<FarmStanding, string> = {
  activa: "Activă",
  avertizata: "Avertizată",
  suspendata: "Suspendată",
  exclusa: "Exclusă",
};

export const standingEffects: Record<FarmStanding, string> = {
  activa: "Funcționează normal.",
  avertizata: "Funcționează normal; gospodarul vede avertismentul în panou.",
  suspendata: "Nu poate crea loturi; loturile ei nu mai primesc precomenzi. Comenzile existente continuă.",
  exclusa: "Scoasă din platformă: ascunsă de pe site, fără precomenzi, conturile gospodarilor dezactivate.",
};

export interface GovernanceEvent {
  at: string;
  by: string;
  action: string;
  reason: string;
}

/** Regimul unei gospodării: limite proprii, starea (avertizare, suspendare, excludere) și istoricul. */
export interface FarmGovernance {
  /** Slug-ul gospodăriei. */
  id: string;
  birdsPerYear?: number;
  birdsPerLot?: number;
  /** Motivul limitelor proprii (ex. suprafață insuficientă). */
  limitReason?: string;
  standing: FarmStanding;
  standingReason?: string;
  /** Doar dacă legea permite: mai multe loturi simultane în aceeași gospodărie. */
  allowConcurrentLots?: boolean;
  events: GovernanceEvent[];
}

/** Suprafața verde pentru creștere: declarată de gospodar (cu act), măsurată și confirmată de admin. */
export interface FarmLand {
  id: string;
  declaredM2?: number;
  proofDocumentId?: string;
  declaredAt?: string;
  declaredBy?: string;
  verifiedM2?: number;
  verifiedAt?: string;
  verifiedBy?: string;
  note?: string;
}

/** Limitele efective: țarcurile permise de suprafața confirmată, plafoanele admin și cel legal. */
export function effectiveLimits(g: FarmGovernance | null, land?: FarmLand | null) {
  const pens = pensForArea(land?.verifiedM2 ?? 0);
  const byLand = pens * GROWTH.birdsPerPen;
  const cap = g?.birdsPerLot ?? DEFAULT_LIMITS.birdsPerLot;
  return {
    birdsPerYear: g?.birdsPerYear ?? DEFAULT_LIMITS.birdsPerYear,
    birdsPerLot: Math.min(byLand, cap),
    pens: Math.min(pens, Math.floor(cap / GROWTH.birdsPerPen)),
    landVerified: Boolean(land?.verifiedM2),
    custom: Boolean(g?.birdsPerYear || g?.birdsPerLot),
    reason: g?.limitReason,
  };
}

const countsForLimit = (l: Lot) => !l.approval || l.approval.status !== "respins";

/** Păsările din loturile care încep în anul dat (fără loturile respinse). */
export function birdsInYear(lots: Lot[], year: number, exceptCode?: string) {
  return lots
    .filter((l) => countsForLimit(l) && l.code !== exceptCode && Number(l.startDate.slice(0, 4)) === year)
    .reduce((s, l) => s + l.totalBirds, 0);
}

/** Mesajul de eroare dacă un lot (nou sau modificat) depășește limitele, altfel "". */
export function checkLotLimits(
  lots: Lot[],
  g: FarmGovernance | null,
  lot: { totalBirds: number; startDate: string; code?: string },
  land?: FarmLand | null,
) {
  const lim = effectiveLimits(g, land);
  if (!lim.landVerified) {
    return "Suprafața pentru creștere nu e încă confirmată: încarcă actul de proprietate și declară suprafața; după măsurare, Puii mei o confirmă.";
  }
  if (!g?.allowConcurrentLots) {
    const overlap = overlapError(lots, lot.startDate, lot.code);
    if (overlap) return overlap;
  }
  if (lot.totalBirds > lim.birdsPerLot) {
    return `Maximum ${lim.birdsPerLot} păsări pe lot (${lim.pens} țarcuri × ${GROWTH.birdsPerPen}) pentru această gospodărie${lim.reason ? ` – ${lim.reason}` : ""}.`;
  }
  const year = Number(lot.startDate.slice(0, 4));
  const used = birdsInYear(lots, year, lot.code);
  if (used + lot.totalBirds > lim.birdsPerYear) {
    const left = Math.max(0, lim.birdsPerYear - used);
    return `Limita anuală e de ${lim.birdsPerYear.toLocaleString("ro-RO")} păsări în ${year}: mai sunt disponibile ${left.toLocaleString("ro-RO")}.`;
  }
  return "";
}
