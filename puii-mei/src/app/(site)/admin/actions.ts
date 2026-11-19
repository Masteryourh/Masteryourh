"use server";

import { revalidatePath } from "next/cache";
import type { PreorderStatus } from "@/lib/domain";
import { normalizeLotCode } from "@/lib/lots";
import { requireAdmin } from "@/server/auth";
import { markDelivered } from "@/server/delivery";
import { preorderRepository } from "@/server/repositories/preorders";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { lotRepository } from "@/server/repositories/catalog";

const allowed: PreorderStatus[] = ["noua", "confirmata", "alocata-lot", "in-livrare", "livrata", "anulata"];

export async function updatePreorderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PreorderStatus;
  if (!id || !allowed.includes(status)) throw new Error("Date invalide");
  // „Livrată” (de obicei bifat de curier) creează și trimite linkul de confirmare.
  if (status === "livrata") await markDelivered(id, "admin");
  else await preorderRepository.updateStatus(id, status);
  revalidatePath("/admin", "layout");
  revalidatePath("/curier");
}

/** Alocă (sau schimbă) lotul unei precomenzi – necesar pentru a ști gospodăria. */
export async function updatePreorderLot(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("lotCode") ?? "");
  const lot = raw ? await lotRepository.byCode(normalizeLotCode(raw)) : null;
  if (!id || (raw && !lot)) throw new Error("Lot invalid");
  await preorderRepository.update(id, { lotCode: lot?.code ?? null });
  const confirmation = await confirmationRepository.byPreorder(id);
  if (confirmation && !confirmation.submittedAt) {
    await confirmationRepository.update(id, { lotCode: lot?.code ?? null, farmSlug: lot?.farmSlug ?? null });
  }
  revalidatePath("/admin", "layout");
}
