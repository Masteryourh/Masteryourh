"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { PreorderStatus } from "@/lib/domain";
import { isValidAdminAuthorization } from "@/server/auth";
import { preorderRepository } from "@/server/repositories/preorders";

const allowed: PreorderStatus[] = ["noua", "confirmata", "alocata-lot", "in-livrare", "livrata", "anulata"];

export async function updatePreorderStatus(formData: FormData) {
  const h = await headers();
  if (!isValidAdminAuthorization(h.get("authorization"))) throw new Error("Neautorizat");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PreorderStatus;
  if (!id || !allowed.includes(status)) throw new Error("Date invalide");
  await preorderRepository.updateStatus(id, status);
  revalidatePath("/admin");
}
