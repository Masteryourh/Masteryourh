import { penWindowOpen } from "./growth";
import type { Lot, LotStageDefinition, LotStageKey, LotStatus } from "./domain";
import type { Species } from "./products";

/** Specia lotului; loturile vechi, fără câmp, sunt loturi de pui. */
export function lotSpecies(lot: Lot): Species {
  return lot.species ?? "pui";
}

const DAY = 24 * 60 * 60 * 1000;
/** Zile între finalul creșterii și disponibilitatea pentru livrare. */
export const PROCESSING_DAYS = 2;
/** Zile în care lotul rămâne „disponibil” înainte de a fi considerat livrat. */
export const DELIVERY_WINDOW_DAYS = 7;
/** Cu câte zile înainte de start se deschid precomenzile. */
export const PREORDER_WINDOW_DAYS = 45;

export function lotStages(lot: Lot): LotStageDefinition[] {
  return [
    {
      key: "precomenzi",
      label: "Precomenzi",
      description: "Clienții rezervă puii din lot și plătesc avansul (puii de o zi și furajul), direct gospodăriei. Producția se planifică pe baza cererii.",
      startDay: -PREORDER_WINDOW_DAYS,
    },
    {
      key: "pui-de-o-zi",
      label: "Pui de o zi",
      description: "Puii de o zi, din incubatoare autorizate, ajung în gospodărie. Primele 21 de zile stau la interior, la căldură (becuri roșii) și pe pat de rumeguș.",
      startDay: 0,
    },
    {
      key: "crestere",
      label: "Pe pășune, în țarc",
      description: "De la 21 de zile, puii trec pe pășune, în țarcuri mobile de 4 × 3 m (40 de pui), mutate zilnic pe iarbă proaspătă. Gospodarul notează fiecare mutare și fiecare intervenție.",
      startDay: 21,
    },
    {
      key: "finisare",
      label: "Finisare",
      description: "Ultimele două săptămâni: pășune, hrană din cereale și verificare veterinară.",
      startDay: lot.growthDays - 14,
    },
    {
      key: "procesare",
      label: "Sacrificare tradițională",
      description: "Puii sunt sacrificați tradițional, în gospodăria în care au crescut, cu respectarea normelor sanitar-veterinare.",
      startDay: lot.growthDays,
    },
    {
      key: "livrare",
      label: "Livrare",
      description: "Puii proaspeți sunt livrați în lanț frigorific în zona aleasă.",
      startDay: lot.growthDays + PROCESSING_DAYS,
    },
  ];
}

export function startOf(lot: Lot) {
  return new Date(`${lot.startDate}T00:00:00`);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY);
}

export function lotDay(lot: Lot, now = new Date()) {
  return Math.floor((now.getTime() - startOf(lot).getTime()) / DAY);
}

export function availabilityDate(lot: Lot) {
  return addDays(startOf(lot), lot.growthDays + PROCESSING_DAYS);
}

export function stageDate(lot: Lot, stage: LotStageDefinition) {
  return addDays(startOf(lot), stage.startDay);
}

export function currentStage(lot: Lot, now = new Date()): LotStageKey {
  const day = lotDay(lot, now);
  const stages = lotStages(lot);
  let current: LotStageKey = stages[0].key;
  for (const s of stages) if (day >= s.startDay) current = s.key;
  return current;
}

export function lotStatus(lot: Lot, now = new Date()): LotStatus {
  const day = lotDay(lot, now);
  if (day < 0) return "precomenzi-deschise";
  if (day < lot.growthDays) return "in-crestere";
  if (day < lot.growthDays + PROCESSING_DAYS) return "in-procesare";
  if (day < lot.growthDays + PROCESSING_DAYS + DELIVERY_WINDOW_DAYS) return "disponibil";
  return "livrat";
}

export const statusLabels: Record<LotStatus, string> = {
  "precomenzi-deschise": "Precomenzi deschise",
  "in-crestere": "În creștere",
  "in-procesare": "La sacrificare",
  disponibil: "Disponibil pentru livrare",
  livrat: "Livrat",
};

export function availableBirds(lot: Lot) {
  return Math.max(0, lot.totalBirds - lot.reservedBirds);
}

/** Progresul creșterii, 0–100. */
export function growthProgress(lot: Lot, now = new Date()) {
  const day = lotDay(lot, now);
  return Math.min(100, Math.max(0, Math.round((day / lot.growthDays) * 100)));
}

/** Lotul e public (aprobat de admin sau creat de admin). */
export const isApproved = (lot: Lot) => !lot.approval || lot.approval.status === "aprobat";

export function isOpenForPreorder(lot: Lot, now = new Date()) {
  if (!penWindowOpen(lot, now)) return false;
  return isApproved(lot) && !lot.closed && lotStatus(lot, now) === "precomenzi-deschise" && availableBirds(lot) > 0;
}

/** Normalizează codul introdus de client (spații, litere mici). */
/**
 * Prefixul codului de lot: inițialele localității (ex. Moldova-Sulița → MS, Vatra Moldoviței → VM);
 * pentru un singur cuvânt, primele două litere (Breaza → BR).
 */
export function villagePrefix(village: string) {
  const words = village
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
  if (!words.length) return "XX";
  return words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2).padEnd(2, "X");
}

/** Codul lotului: localitate – anul pornirii – numărul lotului în localitate în acel an (ex. MS-2026-01). */
export function lotCodeFor(village: string, startDate: string, existing: Set<string>) {
  const base = `${villagePrefix(village)}-${startDate.slice(0, 4)}-`;
  for (let i = 1; ; i++) {
    const code = base + String(i).padStart(2, "0");
    if (!existing.has(code)) return code;
  }
}

export function normalizeLotCode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
