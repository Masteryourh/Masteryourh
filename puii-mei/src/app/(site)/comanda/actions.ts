"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { declareFeedPayment, ensureTrackingToken } from "@/server/orders";
import { preorderRepository } from "@/server/repositories/preorders";
import { notifyOrderEvent } from "@/server/notifications";

const digits = (s: string) => s.replace(/\D/g, "").slice(-9);

export type FindOrderState = { status: "idle" } | { status: "error"; error: string; number: string };

/** Găsește comanda după număr + telefon și deschide pagina ei. */
export async function findOrder(_p: FindOrderState, formData: FormData): Promise<FindOrderState> {
  const number = String(formData.get("number") ?? "").trim();
  const phone = String(formData.get("phone") ?? "");
  const p = number ? await preorderRepository.byNumber(number) : null;
  if (!p || digits(phone).length < 9 || digits(p.customer.phone) !== digits(phone)) {
    return { status: "error", error: "Nu am găsit o comandă cu acest număr și acest telefon.", number };
  }
  redirect(`/comanda/${await ensureTrackingToken(p)}`);
}

/** Clientul anunță că a plătit avansul pentru hrană. */
export async function declarePaymentAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  let error = "";
  try {
    await declareFeedPayment(token);
  } catch (err) {
    error = err instanceof Error ? err.message : "Nu s-a putut salva.";
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/cont/gospodar", "layout");
  redirect(`/comanda/${token}${error ? `?eroare=${encodeURIComponent(error)}` : "?platit=1"}#plata`);
}

/** Clientul își anulează precomanda, gratuit, cât timp nu e confirmată. */
export async function cancelOrderAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const p = await preorderRepository.byTrackingToken(token);
  if (!p) redirect("/comanda");
  if (p.status === "noua" && (p.feedPayment?.status ?? "de-platit") === "de-platit") {
    await preorderRepository.updateStatus(p.id, "anulata");
    await notifyOrderEvent(p, "anulata");
  }
  revalidatePath("/", "layout");
  redirect(`/comanda/${token}`);
}
