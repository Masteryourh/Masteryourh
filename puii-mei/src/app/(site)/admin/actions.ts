"use server";

import { revalidatePath } from "next/cache";
import type { PreorderStatus } from "@/lib/domain";
import { requireAdmin } from "@/server/auth";
import { preorderRepository } from "@/server/repositories/preorders";

const allowed: PreorderStatus[] = ["noua", "confirmata", "alocata-lot", "in-livrare", "livrata", "anulata"];

export async function updatePreorderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PreorderStatus;
  if (!id || !allowed.includes(status)) throw new Error("Date invalide");
  await preorderRepository.updateStatus(id, status);
  revalidatePath("/admin");
}
