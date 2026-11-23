"use server";

import { revalidatePath } from "next/cache";
import type { PreorderStatus } from "@/lib/domain";
import { requireAdmin } from "@/server/auth";
import { preorderRepository } from "@/server/repositories/preorders";
import { lotRepository } from "@/server/repositories/catalog";
import { parcelRepository } from "@/server/repositories/delivery";
import { normalizeLotCode } from "@/lib/lots";
import { site } from "@/lib/site";
import { notifyFarm, notifyOrderEvent } from "@/server/notifications";
import { processWaitingPreorders } from "@/server/allocation";
import { releaseSeats, reserveSeats } from "@/server/seats";

const allowed: PreorderStatus[] = ["noua", "confirmata", "alocata-lot", "in-livrare", "livrata", "anulata"];

export async function updatePreorderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PreorderStatus;
  if (!id || !allowed.includes(status)) throw new Error("Date invalide");
  const before = await preorderRepository.byId(id);
  // Locurile din lot (CG-04): anularea le eliberează; reactivarea unei comenzi anulate le ocupă din nou, dacă mai sunt.
  if (before?.lotCode && before.status === "anulata" && status !== "anulata") {
    if (!(await reserveSeats(before.lotCode, before.id, before.birds))) throw new Error(`Lotul ${before.lotCode} nu mai are ${before.birds} locuri libere`);
  }
  const updated = await preorderRepository.updateStatus(id, status);
  if (before?.lotCode && status === "anulata" && before.status !== "anulata") await releaseSeats(before.lotCode, before.id);
  if (updated && before?.status !== status && (status === "confirmata" || status === "livrata" || status === "anulata")) {
    await notifyOrderEvent(updated, status);
  }
  if (status === "anulata") await processWaitingPreorders();
  revalidatePath("/", "layout");
}

/** Alocă lotul unei precomenzi (necesar ca gospodarul s-o vadă și să-i genereze eticheta). */
export async function updatePreorderLot(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("lotCode") ?? "");
  const lot = raw ? await lotRepository.byCode(normalizeLotCode(raw)) : null;
  if (!id || (raw && !lot)) throw new Error("Lot invalid");
  const parcel = await parcelRepository.byId(id);
  if (parcel?.loaded) throw new Error("Coletul a fost deja încărcat; lotul nu se mai poate schimba");
  const before = await preorderRepository.byId(id);
  if (!before) throw new Error("Precomandă inexistentă");
  // Alocarea manuală respectă și ea locurile lotului (CG-04).
  const active = before.status !== "anulata";
  if (lot && active && before.lotCode !== lot.code && !(await reserveSeats(lot.code, before.id, before.birds))) {
    throw new Error(`Lotul ${lot.code} nu mai are ${before.birds} locuri libere`);
  }
  if (before.lotCode && before.lotCode !== lot?.code) await releaseSeats(before.lotCode, before.id);
  const updated = await preorderRepository.update(id, { lotCode: lot?.code ?? null, ...(lot ? { status: "alocata-lot" as const } : {}) });
  if (updated && lot && before?.lotCode !== lot.code) {
    await notifyOrderEvent(updated, "alocata");
    await notifyFarm(lot.farmSlug, `Comandă nouă pe lotul ${lot.code}`, `Precomanda ${updated.number} (${updated.birds} pui, ${updated.customer.name}) a fost alocată lotului ${lot.code}.\n${site.url}/cont/gospodar`);
  }
  if (parcel && lot) await parcelRepository.update(id, { lotCode: lot.code, farmSlug: lot.farmSlug });
  revalidatePath("/", "layout");
}
