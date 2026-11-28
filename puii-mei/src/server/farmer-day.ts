import "server-only";
import { farmerToday } from "@/lib/farmer-today";
import { growthAlerts } from "@/lib/growth-log";
import { expiringDocuments } from "@/lib/document-expiry";
import { lotDay, lotStatus } from "@/lib/lots";
import { lotRepository } from "./repositories/catalog";
import { preorderRepository } from "./repositories/preorders";
import { parcelRepository, tourRepository } from "./repositories/delivery";
import { farmPaymentRepository } from "./repositories/farm-payments";
import { documentRepository } from "./repositories/documents";
import { growthLogRepository } from "./repositories/growth-log";

/** Ziua de azi în calendarul din România (AAAA-LL-ZZ). */
const todayRo = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(now);

/**
 * „De făcut azi” pentru o gospodărie: o singură sursă pentru panoul gospodarului și pentru rezumatul de dimineață.
 * Doar citiri, prin indexuri (lotul, gospodăria); `q` păstrează gospodăria aleasă când adminul previzualizează.
 */
export async function farmerDayItems(farmSlug: string, { q = "", now = new Date() }: { q?: string; now?: Date } = {}) {
  const lots = await lotRepository.byFarm(farmSlug, { all: true });
  const codes = lots.map((l) => l.code);
  const [preorders, parcels, tours, payment, docs, journal] = await Promise.all([
    preorderRepository.byLots(codes),
    parcelRepository.byFarm(farmSlug),
    tourRepository.byFarm(farmSlug),
    farmPaymentRepository.bySlug(farmSlug),
    documentRepository.byFarm(farmSlug),
    growthLogRepository.byFarm(farmSlug),
  ]);
  const lotCodes = new Set(codes);
  const orders = preorders.filter((p) => p.lotCode && lotCodes.has(p.lotCode) && p.status !== "anulata");
  const orderIds = new Set(orders.map((p) => p.id));
  const farmTours = tours.filter((t) => t.farmSlug === farmSlug);
  const activeTourIds = new Set(farmTours.filter((t) => t.status !== "anulata").map((t) => t.id));
  const ready = parcels.filter((x) => x.farmSlug === farmSlug && !x.delivered && (!x.tourId || !activeTourIds.has(x.tourId)) && orderIds.has(x.id));
  const approved = lots.filter((l) => !l.approval || l.approval.status === "aprobat");
  const growing = approved.filter((l) => lotStatus(l) === "in-crestere");
  const feedPaid = orders.filter((p) => p.feedPayment?.status === "primita").length;

  return farmerToday({
    base: "/cont/gospodar",
    q,
    today: todayRo(now),
    growthAlerts: growthAlerts(lots, journal, now),
    growing: growing.map((l) => ({ code: l.code, day: Math.max(0, lotDay(l)), days: l.growthDays })),
    entries: journal,
    expiring: expiringDocuments(docs, now).map(({ doc, days }) => ({ id: doc.id, title: doc.title, days })),
    pendingLots: lots.filter((l) => l.approval?.status === "asteapta").map((l) => l.code),
    advancesDue: orders.length - feedPaid,
    hasPayment: Boolean(payment),
    orders: orders.length,
    tours: farmTours.map((t) => ({ id: t.id, code: t.code, date: t.date, status: t.status, parcels: t.parcelIds.length })),
    readyParcels: ready.length,
  });
}
