"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { setFeedReceived } from "@/server/orders";
import { farmPaymentRepository, normalizeIban } from "@/server/repositories/farm-payments";
import { checkMfaCode, mfaEnabled } from "@/server/mfa";
import { reportUnrequested, savePaymentDetails } from "@/server/iban";
import { auditedAction } from "@/server/audit";

const refresh = () => {
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/comanda", "layout");
  revalidatePath("/precomanda");
};

/** Datele contului în care clienții plătesc avansul pentru hrană. */
async function saveFarmPaymentAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = String(formData.get("farmSlug") ?? "");
  const back = `/cont/gospodar${user.role === "admin" ? `?gospodarie=${encodeURIComponent(farmSlug)}&` : "?"}`;
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  const holder = String(formData.get("holder") ?? "").trim();
  const bank = String(formData.get("bank") ?? "").trim();
  const iban = normalizeIban(String(formData.get("iban") ?? ""));
  const price = Number(String(formData.get("feedPricePerKg") ?? "").replace(",", "."));
  const chick = Number(String(formData.get("chickPricePerBird") ?? "").replace(",", "."));
  let error = "";
  if (holder.length < 3) error = "Completează titularul contului.";
  else if (!iban) error = "IBAN invalid. Exemplu: RO49 AAAA 1B31 0075 9384 0000.";
  else if (!(price > 0 && price < 50)) error = "Prețul furajului trebuie să fie între 0 și 50 lei / kg.";
  else if (!(chick > 0 && chick < 100)) error = "Prețul puiului de o zi trebuie să fie între 0 și 100 lei.";
  if (error) redirect(`${back}eroarePlata=${encodeURIComponent(error)}#plata-hrana`);
  // MFA (ADR-009, varianta b): schimbarea unui cont bancar EXISTENT cere codul din aplicația de autentificare
  // (pentru gospodari). Primul cont al gospodăriei se verifică doar prin apelul telefonic.
  const current = await farmPaymentRepository.bySlug(farmSlug);
  const changesAccount = Boolean(current?.iban) && (current!.iban !== iban || current!.holder !== holder || current!.bank !== bank);
  if (changesAccount && user.role === "gospodar") {
    if (!mfaEnabled(user)) {
      redirect(`${back}eroarePlata=${encodeURIComponent("Pentru schimbarea contului bancar activează întâi codul de confirmare: Securitate (în meniu).")}#plata-hrana`);
    }
    const check = await checkMfaCode(user.id, String(formData.get("mfaCode") ?? ""));
    if (!check.ok) redirect(`${back}eroarePlata=${encodeURIComponent(check.error)}#plata-hrana`);
  }
  // Prețurile se schimbă imediat; un cont bancar nou intră în verificare (clienții văd contul activ până la confirmare).
  const change = await savePaymentDetails(
    user,
    farmSlug,
    { holder, iban: iban!, bank },
    { feedPricePerKg: Math.round(price * 100) / 100, chickPricePerBird: Math.round(chick * 100) / 100 },
  );
  refresh();
  redirect(`${back}${change && change.status === "in-verificare" ? "ibanVerificare=1" : "salvatPlata=1"}#plata-hrana`);
}

/** „Nu am cerut eu”: anulează cererea de schimbare a contului și blochează contul care a cerut-o. */
async function reportUnrequestedIbanAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = String(formData.get("farmSlug") ?? "");
  const back = `/cont/gospodar${user.role === "admin" ? `?gospodarie=${encodeURIComponent(farmSlug)}&` : "?"}`;
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  const r = await reportUnrequested(user, farmSlug, String(formData.get("changeId") ?? ""));
  refresh();
  redirect(`${back}${r.ok ? "ibanAnulat=1" : `eroarePlata=${encodeURIComponent(r.error)}`}#plata-hrana`);
}

/** Confirmă (sau anulează confirmarea) primirii avansului pentru hrană. */
async function setFeedReceivedAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  await setFeedReceived(String(formData.get("id") ?? ""), user, formData.get("received") === "1");
  refresh();
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const saveFarmPaymentAction = auditedAction({ action: "household.plati.saveFarmPayment", workspace: "household", resourceType: "plati", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, saveFarmPaymentAction__impl);
export const reportUnrequestedIbanAction = auditedAction({ action: "household.plati.reportUnrequestedIban", workspace: "household", resourceType: "plati", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, reportUnrequestedIbanAction__impl);
export const setFeedReceivedAction = auditedAction({ action: "household.plati.setFeedReceived", workspace: "household", resourceType: "plati", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, setFeedReceivedAction__impl);
