"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { declareFeedPayment } from "@/server/orders";
import { requestOrderPin, requireOrderAccess, verifyOrderPin } from "@/server/order-access";
import { preorderRepository } from "@/server/repositories/preorders";
import { notifyOrderEvent } from "@/server/notifications";
import { chooseWait, processWaitingPreorders, splitPreorder } from "@/server/allocation";
import { releaseSeats } from "@/server/seats";

export type FindOrderState =
  | { status: "idle"; number?: string }
  | { status: "pin"; number: string; masked: string; channel: "sms" | "email" | "manual"; error?: string }
  | { status: "error"; error: string; number: string };

/** Pasul 1: numărul precomenzii → PIN trimis pe telefonul clientului (valabil 24 de ore). */
export async function requestPinAction(_p: FindOrderState, formData: FormData): Promise<FindOrderState> {
  const number = String(formData.get("number") ?? "").trim();
  const r = await requestOrderPin(number);
  if (!r.ok) return { status: "error", error: r.error, number };
  return { status: "pin", number: r.number, masked: r.masked, channel: r.channel };
}

/** Pasul 2: PIN-ul → acces 24 de ore la „Comanda mea”. */
export async function verifyPinAction(prev: FindOrderState, formData: FormData): Promise<FindOrderState> {
  const number = String(formData.get("number") ?? "").trim();
  const r = await verifyOrderPin(number, String(formData.get("pin") ?? ""));
  if (!r.ok) {
    return prev.status === "pin" ? { ...prev, error: r.error } : { status: "error", error: r.error, number };
  }
  redirect(`/comanda/${r.token}`);
}

/** Clientul anunță că a plătit avansul pentru hrană. */
export async function declarePaymentAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await requireOrderAccess(token);
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
  const p = await requireOrderAccess(token);
  if (!p) redirect("/comanda");
  if (p.status === "noua" && (p.feedPayment?.status ?? "de-platit") === "de-platit") {
    await preorderRepository.updateStatus(p.id, "anulata");
    if (p.lotCode) await releaseSeats(p.lotCode, p.id);
    await notifyOrderEvent(p, "anulata");
    if (p.lotCode) await processWaitingPreorders();
  }
  revalidatePath("/", "layout");
  redirect(`/comanda/${token}`);
}

/** Comanda nu încape într-o singură gospodărie: clientul alege împărțirea sau așteptarea. */
export async function allocationChoiceAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const p = await requireOrderAccess(token);
  if (!p) redirect("/comanda");
  if (!p.lotCode && p.status !== "anulata") {
    if (formData.get("choice") === "imparte") await splitPreorder(p);
    else await chooseWait(p);
  }
  revalidatePath("/", "layout");
  redirect(`/comanda/${token}#alocare`);
}
