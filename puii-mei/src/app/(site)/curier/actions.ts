"use server";

import { revalidatePath } from "next/cache";
import { requireCourier } from "@/server/auth";
import { markDelivered } from "@/server/delivery";
import { confirmationRepository } from "@/server/repositories/confirmations";

/** Curierul bifează „Livrat” (din lista lui sau după scanarea QR-ului de pe colet). */
export async function courierMarkDelivered(formData: FormData) {
  await requireCourier();
  let id = String(formData.get("id") ?? "");
  const courierToken = String(formData.get("courierToken") ?? "");
  if (courierToken) id = (await confirmationRepository.byCourierToken(courierToken))?.id ?? "";
  if (!id) throw new Error("Date invalide");
  await markDelivered(id, "curier");
  revalidatePath("/curier", "layout");
  revalidatePath("/admin", "layout");
}
