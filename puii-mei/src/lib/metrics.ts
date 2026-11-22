import type { Expense, Investment, Lot, Preorder } from "./domain";
import { GROWTH } from "./growth";
import { pricing } from "./pricing";

/** Cifrele publice ale platformei, calculate doar din date confirmate (registrul fiscal, plăți confirmate). */
export interface CompanyMetrics {
  farms: number;
  birdsOrdered: number;
  birdsStarted: number;
  birdsGrowing: number;
  birdsDelivered: number;
  kgDelivered: number;
  feedKg: number;
  feedLei: number;
  advancesConfirmed: number;
  revenue: number;
  expenses: number;
  profit: number;
  taxes: number;
  investments: number;
  moneyIntoFarms: number;
  expensesByCategory: { label: string; value: number }[];
  byYear: { year: string; revenue: number; expenses: number }[];
  byFarm: { slug: string; birds: number; revenue: number; expenses: number; profit: number }[];
}

const expenseLabels: Record<string, string> = {
  pui: "Pui de o zi", furaj: "Furaj (cereale)", sanatate: "Sănătate / veterinar", energie: "Energie", asternut: "Așternut",
  ambalaje: "Ambalaje", transport: "Transport", manopera: "Manoperă", taxe: "Taxe și impozite", altele: "Altele",
};

const valid = (e: Expense) => Boolean(e.confirmedAt) && !e.voided;

export function companyMetrics(
  { farms, lots, preorders, expenses, investments }: { farms: { slug: string }[]; lots: Lot[]; preorders: Preorder[]; expenses: Expense[]; investments: Investment[] },
  now = new Date(),
): CompanyMetrics {
  const today = now.toISOString().slice(0, 10);
  const live = preorders.filter((p) => p.status !== "anulata" && p.allocation?.status !== "impartita");
  const delivered = live.filter((p) => p.status === "livrata");
  const birdsDelivered = delivered.reduce((s, p) => s + p.birds, 0);

  const startedBirds = (l: Lot) => (l.penStarts?.length ?? 0) * GROWTH.birdsPerPen;
  const growing = (l: Lot) => {
    const first = l.penStarts?.[0]?.date;
    if (!first) return false;
    const end = new Date(first);
    end.setDate(end.getDate() + l.growthDays);
    return first <= today && end.toISOString().slice(0, 10) > today;
  };
  const birdsStarted = lots.reduce((s, l) => s + startedBirds(l), 0);

  const ok = expenses.filter(valid);
  const out = ok.filter((e) => (e.kind ?? "cheltuiala") === "cheltuiala");
  const inc = ok.filter((e) => e.kind === "venit");
  const sum = (xs: Expense[]) => xs.reduce((s, e) => s + e.amount, 0);
  const revenue = sum(inc);
  const spent = sum(out);

  const cat = new Map<string, number>();
  for (const e of out) cat.set(e.category, (cat.get(e.category) ?? 0) + e.amount);
  const years = new Map<string, { revenue: number; expenses: number }>();
  for (const e of ok) {
    const y = years.get(e.date.slice(0, 4)) ?? { revenue: 0, expenses: 0 };
    if (e.kind === "venit") y.revenue += e.amount;
    else y.expenses += e.amount;
    years.set(e.date.slice(0, 4), y);
  }
  const investmentsTotal = investments
    .filter((i) => i.farmSlug && (i.status === "activa" || i.status === "finalizata"))
    .reduce((s, i) => s + i.amount, 0);
  const advancesConfirmed = live
    .filter((p) => p.feedPayment?.confirmedAt)
    .reduce((s, p) => s + (p.feedPayment?.amount ?? 0), 0);

  const byFarm = farms.map((f) => {
    const r = sum(inc.filter((e) => e.farmSlug === f.slug));
    const x = sum(out.filter((e) => e.farmSlug === f.slug));
    const birds = lots.filter((l) => l.farmSlug === f.slug).reduce((s, l) => s + startedBirds(l), 0);
    return { slug: f.slug, birds, revenue: r, expenses: x, profit: r - x };
  });

  return {
    farms: farms.length,
    birdsOrdered: live.reduce((s, p) => s + p.birds, 0),
    birdsStarted,
    birdsGrowing: lots.filter(growing).reduce((s, l) => s + startedBirds(l), 0),
    birdsDelivered,
    kgDelivered: Math.round(birdsDelivered * pricing.avgWeightKg),
    feedKg: Math.round(birdsStarted * pricing.feedKgPerBird),
    feedLei: cat.get("furaj") ?? 0,
    advancesConfirmed,
    revenue,
    expenses: spent,
    profit: revenue - spent,
    taxes: cat.get("taxe") ?? 0,
    investments: investmentsTotal,
    moneyIntoFarms: revenue + investmentsTotal,
    expensesByCategory: [...cat].map(([k, v]) => ({ label: expenseLabels[k] ?? k, value: v })).sort((a, b) => b.value - a.value),
    byYear: [...years].map(([year, v]) => ({ year, ...v })).sort((a, b) => a.year.localeCompare(b.year)),
    byFarm,
  };
}
