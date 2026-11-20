"use server";

import { revalidatePath } from "next/cache";
import type { PreorderStatus } from "@/lib/domain";
import { requireAdmin } from "@/server/auth";
import { preorderRepository } from "@/server/repositories/preorders";
import { lotRepository } from "@/server/repositories/catalog";
import { parcelRepository } from "@/server/repositories/delivery";
import { normalizeLotCode } from "@/lib/lots";

const allowed: PreorderStatus[] = ["noua", "confirmata", "alocata-lot", "in-livrare", "livrata", "anulata"];

export async function updatePreorderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PreorderStatus;
  if (!id || !allowed.includes(status)) throw new Error("Date invalide");
  await preorderRepository.updateStatus(id, status);
  revalidatePath("/admin");
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
  await preorderRepository.update(id, { lotCode: lot?.code ?? null, ...(lot ? { status: "alocata-lot" as const } : {}) });
  if (parcel && lot) await parcelRepository.update(id, { lotCode: lot.code, farmSlug: lot.farmSlug });
  revalidatePath("/admin", "layout");
  revalidatePath("/cont/gospodar", "layout");
}
