import type { Lot } from "@/lib/domain";

/**
 * Loturi de producție – date demonstrative.
 * Statusul fiecărui lot este calculat automat din data de început și durata creșterii
 * (vezi `src/lib/lots.ts`).
 */
const breed = "Pui cu creștere lentă (hibrid de exterior)";
const processor = "Sacrificare tradițională în gospodăria de creștere";

export const lots: Lot[] = [
  {
    code: "PM-2609-A01",
    farmSlug: "gospodaria-muresan",
    breed,
    startDate: "2026-09-10",
    growthDays: 60,
    totalBirds: 200,
    reservedBirds: 200,
    feed: "Furaje din cereale, finisare cu porumb din producție proprie",
    processor,
    notes: "Primul lot pilot. Livrat integral.",
  },
  {
    code: "PM-2609-B01",
    farmSlug: "ferma-de-la-deal",
    breed,
    startDate: "2026-09-24",
    growthDays: 60,
    totalBirds: 240,
    reservedBirds: 236,
    feed: "Furaje din cereale, fără promotori de creștere",
    processor,
  },
  {
    code: "PM-2610-A02",
    farmSlug: "gospodaria-muresan",
    breed,
    startDate: "2026-10-15",
    growthDays: 60,
    totalBirds: 220,
    reservedBirds: 204,
    feed: "Furaje din cereale, finisare cu porumb din producție proprie",
    processor,
  },
  {
    code: "PM-2611-C01",
    farmSlug: "gospodaria-rusu",
    breed,
    startDate: "2026-11-05",
    growthDays: 60,
    totalBirds: 150,
    reservedBirds: 121,
    feed: "Furaje din cereale și verdețuri",
    processor,
  },
  {
    code: "PM-2612-A03",
    farmSlug: "gospodaria-muresan",
    breed,
    startDate: "2026-12-03",
    growthDays: 60,
    totalBirds: 240,
    reservedBirds: 96,
    feed: "Furaje din cereale, finisare cu porumb din producție proprie",
    processor,
  },
  {
    code: "PM-2612-B02",
    farmSlug: "ferma-de-la-deal",
    breed,
    startDate: "2026-12-17",
    growthDays: 60,
    totalBirds: 280,
    reservedBirds: 58,
    feed: "Furaje din cereale, fără promotori de creștere",
    processor,
  },
  {
    code: "PM-2701-C02",
    farmSlug: "gospodaria-rusu",
    breed,
    startDate: "2027-01-07",
    growthDays: 60,
    totalBirds: 160,
    reservedBirds: 12,
    feed: "Furaje din cereale și verdețuri",
    processor,
  },
];
