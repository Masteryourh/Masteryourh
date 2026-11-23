import "server-only";
import type { Lot, Preorder } from "@/lib/domain";
import { sellableBirds } from "@/lib/growth";
import { estimatePrice } from "@/lib/pricing";
import { site } from "@/lib/site";
import { notifyFarm, notifyOrderEvent } from "./notifications";
import { lotRepository, zoneRepository } from "./repositories/catalog";
import { deliverySettingsRepository } from "./repositories/settings";
import { preorderRepository } from "./repositories/preorders";
import { releaseSeats, reserveSeats } from "./seats";

/**
 * Alocarea automată a precomenzilor (docs/plan-platforma.md §1b): clientul nu alege lotul;
 * comanda merge la primul loc disponibil în care încape întreagă. Dacă nu încape nicăieri,
 * clientul alege: împărțire în mai multe gospodării sau așteptare.
 */

async function openLots(): Promise<Lot[]> {
  return (await lotRepository.openForPreorder()).filter((l) => sellableBirds(l) > 0);
}

async function assign(p: Preorder, lot: Lot) {
  const updated = await preorderRepository.update(p.id, {
    lotCode: lot.code,
    status: "alocata-lot",
    allocation: { status: "alocata", at: new Date().toISOString() },
  });
  if (updated) {
    await notifyOrderEvent(updated, "alocata");
    await notifyFarm(lot.farmSlug, `Comandă nouă pe lotul ${lot.code}`, `Precomanda ${updated.number} (${updated.birds} pui) a fost alocată automat lotului ${lot.code}.\n${site.url}/cont/gospodar`);
  }
  return updated;
}

/**
 * Alocare cu rezervare atomică (CG-04): întâi se ocupă locurile în registrul lotului, apoi se scrie lotul pe
 * precomandă. Dacă între timp locurile au fost luate de altă cerere, întoarce null.
 */
async function tryAssign(p: Preorder, lot: Lot): Promise<Preorder | null> {
  if (!(await reserveSeats(lot.code, p.id, p.birds))) return null;
  try {
    const updated = await assign(p, lot);
    if (!updated) await releaseSeats(lot.code, p.id);
    return updated;
  } catch (err) {
    await releaseSeats(lot.code, p.id);
    throw err;
  }
}

/** Primul lot deschis în care încape toată comanda și în care rezervarea reușește. */
async function assignFirstFit(p: Preorder, lots: Lot[]): Promise<Lot | null> {
  for (const l of lots.filter((x) => sellableBirds(x) >= p.birds)) {
    if (await tryAssign(p, l)) return l;
  }
  return null;
}

export type AllocationResult =
  | { kind: "alocata"; lot: Lot }
  | { kind: "alegere"; maxSingle: number; totalFree: number }
  | { kind: "asteapta" };

/** Alocă o precomandă nouă: întreagă în primul lot cu loc, altfel cere alegerea clientului. */
export async function allocateNewPreorder(p: Preorder): Promise<AllocationResult> {
  const fit = await assignFirstFit(p, await openLots());
  if (fit) return { kind: "alocata", lot: fit };
  const lots = await openLots();
  const totalFree = lots.reduce((s, l) => s + sellableBirds(l), 0);
  const status = totalFree > 0 ? "alegere" : "asteapta";
  await preorderRepository.update(p.id, { allocation: { status, at: new Date().toISOString() } });
  if (status === "alegere") {
    await notifyOrderEvent(p, "alegere");
    return { kind: "alegere", maxSingle: Math.max(0, ...lots.map((l) => sellableBirds(l))), totalFree };
  }
  return { kind: "asteapta" };
}

/** Clientul alege să aștepte o gospodărie în care încape toată comanda. */
export async function chooseWait(p: Preorder) {
  if (p.lotCode || p.status === "anulata") return p;
  return preorderRepository.update(p.id, { allocation: { status: "asteapta", at: new Date().toISOString() } });
}

/**
 * Clientul alege împărțirea: comanda se împarte pe loturile disponibile, în ordine. Fiecare parte
 * e o precomandă separată (gospodăria ei, plata ei, livrarea ei, linkul ei). Ce nu încape rămâne în așteptare.
 */
export async function splitPreorder(p: Preorder) {
  if (p.lotCode || p.status === "anulata" || p.allocation?.status === "impartita") return [];
  const lots = await openLots();
  const zone = await zoneRepository.byId(p.zoneId, { includeInactive: true });
  let left = p.birds;
  const plan: { lot: Lot | null; birds: number }[] = [];
  for (const l of lots) {
    if (!left) break;
    const take = Math.min(left, sellableBirds(l));
    if (take > 0) {
      plan.push({ lot: l, birds: take });
      left -= take;
    }
  }
  if (left > 0) plan.push({ lot: null, birds: left });
  if (plan.length < 2 && plan[0]?.lot) {
    if (await tryAssign(p, plan[0].lot)) return [p.number];
    // Locurile au fost luate între timp de altă comandă: comanda așteaptă.
    await chooseWait(p);
    return [];
  }

  const parts: Preorder[] = [];
  for (const [i, part] of plan.entries()) {
    const base = {
      birds: part.birds,
      // Părțile păstrează prețul pe kg de la plasarea comenzii.
      estimate: estimatePrice(part.birds, zone, p.estimate.pricePerKg, (await deliverySettingsRepository.get()).freeDeliveryFrom),
      parentNumber: p.number,
    };
    let piece: Preorder | null;
    if (i === 0) {
      piece = await preorderRepository.update(p.id, base);
    } else {
      const created = await preorderRepository.create({
        customer: p.customer,
        birds: part.birds,
        lotCode: null,
        zoneId: p.zoneId,
        address: p.address,
        location: p.location,
        addressNote: p.addressNote,
        notes: p.notes,
        estimate: base.estimate,
        marketingConsent: p.marketingConsent,
      });
      piece = await preorderRepository.update(created.id, { parentNumber: p.number });
    }
    if (!piece) continue;
    const placed = part.lot ? await tryAssign(piece, part.lot) : null;
    if (placed) piece = placed;
    else piece = (await preorderRepository.update(piece.id, { allocation: { status: "asteapta", at: new Date().toISOString() } })) ?? piece;
    parts.push(piece);
  }
  // Comanda inițială ține lista părților (linkuri către fiecare).
  const first = parts[0];
  if (first) {
    await preorderRepository.update(first.id, {
      allocation: { ...(first.allocation ?? { status: "alocata", at: new Date().toISOString() }), parts: parts.map((x) => x.number) },
    });
  }
  return parts.map((x) => x.number);
}

/** Comenzile în așteptare primesc loc când apare unul suficient (lot nou, aprobat, anulări). */
export async function processWaitingPreorders() {
  const waiting = (await preorderRepository.list())
    .filter((p) => !p.lotCode && p.status !== "anulata" && p.allocation?.status === "asteapta")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const p of waiting) await assignFirstFit(p, await openLots());
}
