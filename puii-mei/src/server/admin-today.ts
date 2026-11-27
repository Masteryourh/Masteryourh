import "server-only";
import { store } from "./db/store";
import { adminAlerts } from "./admin-alerts";
import { seatViolations } from "./seats";
import { unsentMessages } from "./outbox";
import { preorderRepository } from "./repositories/preorders";
import { farmRepository, lotRepository } from "./repositories/catalog";
import { farmPaymentRepository } from "./repositories/farm-payments";
import { tourRepository } from "./repositories/delivery";
import { growthProgress, lotDay, lotStatus } from "@/lib/lots";

/** Un lucru care cere o decizie sau o acțiune a adminului, cu legătura directă spre locul în care se rezolvă. */
export type TodayItem = {
  id: string;
  kind: "precomanda" | "iban" | "lot" | "mesaj" | "locuri" | "crestere" | "document" | "prelungire";
  severity: "urgent" | "atentie" | "info";
  title: string;
  detail: string;
  href: string;
  action: string;
};

/**
 * Admin › Astăzi: coada „Necesită atenția ta” + cifrele zilei + ce e în desfășurare. Doar citiri, din aceleași surse ca
 * paginile existente (fără logică nouă de business); listele mari se citesc pe pagini / agregate.
 */
export async function adminToday(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const [totals, byStatus, newest, alerts, seats, messages, lots, farms, payments, tours] = await Promise.all([
    preorderRepository.activeTotals(),
    store.aggregate("preorders", { sum: [], groupBy: "status" }),
    preorderRepository.page(50),
    adminAlerts(),
    seatViolations(),
    unsentMessages(),
    lotRepository.list({ all: true }),
    farmRepository.listAll(),
    farmPaymentRepository.list(),
    tourRepository.list(),
  ]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const count = (s: string) => byStatus.find((g) => g.key === s)?.count ?? 0;
  const items: TodayItem[] = [];

  for (const v of seats) {
    items.push({ id: `locuri-${v.lot}`, kind: "locuri", severity: "urgent", title: `Lotul ${v.lot} are mai multe locuri ocupate decât are`, detail: `${v.used} / ${v.capacity} locuri. Mută sau anulează comenzi până la capacitate.`, href: `/admin/loturi?deschis=${encodeURIComponent(v.lot)}`, action: "Deschide lotul" });
  }
  for (const p of payments) {
    const c = p.ibanChange;
    if (!c || (c.status !== "in-verificare" && c.status !== "confirmat")) continue;
    items.push({ id: `iban-${c.id}`, kind: "iban", severity: c.status === "in-verificare" ? "urgent" : "info", title: `Cont bancar nou · ${farmName.get(p.id) ?? p.id}`, detail: c.status === "in-verificare" ? "Sună gospodarul la un număr cunoscut și confirmă contul nou." : "Confirmat telefonic; devine activ după 24 de ore.", href: "/admin#iban", action: c.status === "in-verificare" ? "Confirmă" : "Vezi" });
  }
  for (const l of lots.filter((x) => x.approval?.status === "asteapta")) {
    items.push({ id: `lot-${l.code}`, kind: "lot", severity: "atentie", title: `Lot de aprobat · ${l.code}`, detail: `${farmName.get(l.farmSlug) ?? l.farmSlug}: ${l.totalBirds} păsări, pornire ${l.startDate}.`, href: `/admin/loturi?deschis=${encodeURIComponent(l.code)}`, action: "Decide" });
  }
  const fresh = newest.items.filter((p) => p.status === "noua").slice(0, 5);
  for (const p of fresh) {
    items.push({ id: `pre-${p.number}`, kind: "precomanda", severity: "atentie", title: `Precomandă nouă · ${p.number}`, detail: `${p.customer.name}: ${p.birds} pui${p.lotCode ? `, lotul ${p.lotCode}` : ""}.`, href: `/admin/comenzi/${encodeURIComponent(p.number)}?inapoi=${encodeURIComponent("/admin/azi")}`, action: "Deschide" });
  }
  for (const a of alerts) {
    items.push({ id: a.id, kind: a.kind, severity: a.kind === "prelungire" ? "urgent" : "atentie", title: a.title, detail: a.text, href: a.href, action: a.kind === "prelungire" ? "Decide" : "Vezi" });
  }
  const dead = messages.filter((m) => m.status === "dead").length;
  if (dead) items.push({ id: "mesaje-dead", kind: "mesaj", severity: "atentie", title: `${dead === 1 ? "Un mesaj" : `${dead} mesaje`} nu au putut fi trimise`, detail: "E-mail / SMS eșuate definitiv după 6 încercări.", href: "/admin/mesaje", action: "Retrimite" });

  const order = { urgent: 0, atentie: 1, info: 2 } as const;
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  const active = lots
    .filter((l) => (!l.approval || l.approval.status === "aprobat") && ["in-crestere", "in-procesare", "disponibil", "precomenzi-deschise"].includes(lotStatus(l, now)))
    .map((l) => ({ code: l.code, farm: farmName.get(l.farmSlug) ?? l.farmSlug, status: lotStatus(l, now), day: Math.max(0, lotDay(l, now)), days: l.growthDays, progress: growthProgress(l, now), reserved: l.reservedBirds, total: l.totalBirds }))
    .sort((a, b) => b.progress - a.progress);
  const toursToday = tours.filter((t) => t.date === today && t.status !== "anulata").map((t) => ({ id: t.id, code: t.code, farm: farmName.get(t.farmSlug) ?? t.farmSlug, status: t.status }));

  return {
    items,
    kpi: { activeOrders: totals.count, birds: totals.birds, value: totals.value, newOrders: count("noua"), activeLots: active.filter((l) => l.status !== "precomenzi-deschise").length, toursToday: toursToday.length },
    active,
    toursToday,
  };
}
