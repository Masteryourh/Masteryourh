import "server-only";
import type { FarmPaymentDetails, Preorder, User } from "@/lib/domain";
import { feedAdvance } from "@/lib/pricing";
import { canManageFarm } from "./delivery";
import { farmRepository, lotRepository } from "./repositories/catalog";
import { farmPaymentRepository } from "./repositories/farm-payments";
import { newTrackingToken, preorderRepository } from "./repositories/preorders";
import { notifyFarm, notifyOrderEvent } from "./notifications";
import { site } from "@/lib/site";

/** Linkul „Comanda mea” (fără cont). */
export const orderUrl = (origin: string, token: string) => `${origin}/comanda/${token}`;

/** Precomenzile mai vechi nu au cod de urmărire: îl creăm la prima nevoie. */
export async function ensureTrackingToken(p: Preorder): Promise<string> {
  if (p.trackingToken) return p.trackingToken;
  const token = newTrackingToken();
  await preorderRepository.update(p.id, { trackingToken: token });
  return token;
}

export const feedStatusOf = (p: Preorder) => p.feedPayment?.status ?? "de-platit";

/** Gospodăria comenzii (cunoscută după alocarea lotului) și datele ei de plată. */
export async function orderFarm(p: Preorder) {
  const lot = p.lotCode ? await lotRepository.byCode(p.lotCode) : null;
  if (!lot) return { lot: null, farm: null, payment: null as FarmPaymentDetails | null };
  const [farm, payment] = await Promise.all([
    farmRepository.bySlug(lot.farmSlug, { includeInactive: true }),
    farmPaymentRepository.bySlug(lot.farmSlug),
  ]);
  return { lot, farm, payment };
}

/** Suma avansului: cea declarată de client sau calculată cu prețul furajului din gospodărie. */
export function feedFor(p: Preorder, payment: FarmPaymentDetails | null) {
  const advance = feedAdvance(p.birds, payment?.feedPricePerKg, payment?.chickPricePerBird);
  return { ...advance, amount: p.feedPayment?.amount ?? advance.amount };
}

/** Clientul anunță că a făcut transferul. Gospodarul confirmă apoi primirea. */
export async function declareFeedPayment(token: string) {
  const p = await preorderRepository.byTrackingToken(token);
  if (!p) throw new Error("Comanda nu a fost găsită.");
  if (p.status === "anulata") throw new Error("Comanda a fost anulată.");
  if (feedStatusOf(p) !== "de-platit") return p;
  const { payment, lot } = await orderFarm(p);
  if (!payment || !lot) throw new Error("Datele de plată nu sunt încă disponibile.");
  const amount = feedFor(p, payment).amount;
  const updated = await preorderRepository.update(p.id, {
    feedPayment: { status: "declarata", amount, declaredAt: new Date().toISOString() },
  });
  await notifyFarm(
    lot.farmSlug,
    `Plată anunțată: ${p.number}`,
    `${p.customer.name} a anunțat plata avansului (pui de o zi + furaj): ${amount.toFixed(2)} lei, cu detaliile „Avans ${p.number}”. Verifică în cont și confirmă primirea:\n${site.url}/cont/gospodar`,
  );
  return updated;
}

/** Gospodarul (pentru comenzile lui) sau adminul confirmă primirea banilor sau anulează confirmarea. */
export async function setFeedReceived(preorderId: string, user: User, received: boolean) {
  const p = await preorderRepository.byId(preorderId);
  if (!p) throw new Error("Comanda nu există.");
  const { lot, payment } = await orderFarm(p);
  if (!lot || !canManageFarm(user, lot.farmSlug)) throw new Error("Nu ai acces la această comandă.");
  const current = p.feedPayment ?? { status: "de-platit" as const };
  if (received && current.status !== "primita") await notifyOrderEvent(p, "plata-primita");
  return preorderRepository.update(p.id, {
    feedPayment: received
      ? {
          ...current,
          status: "primita",
          amount: current.amount ?? feedFor(p, payment).amount,
          confirmedAt: new Date().toISOString(),
          confirmedBy: `${user.name} (${user.role})`,
        }
      : { status: current.declaredAt ? "declarata" : "de-platit", amount: current.amount, declaredAt: current.declaredAt },
  });
}
