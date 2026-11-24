"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { checkMfaCode, clearMfa, mfaEnabled, startMfaEnrollment } from "@/server/mfa";
import { ENV_ADMIN_ID } from "@/server/session";
import { auditedAction } from "@/server/audit";

const BACK = "/cont/gospodar/securitate";
const go = (q: string) => redirect(`${BACK}?${q}`);

async function account() {
  const user = await requireRole(["gospodar"]);
  if (user.id === ENV_ADMIN_ID) go(`eroare=${encodeURIComponent("Contul de administrator din variabilele de mediu nu poate avea cod de confirmare.")}`);
  return user;
}

async function startMfaAction__impl() {
  const user = await account();
  if (!mfaEnabled(user)) await startMfaEnrollment(user);
  revalidatePath(BACK);
  go("pas=scanare");
}

async function confirmMfaAction__impl(formData: FormData) {
  const user = await account();
  const r = await checkMfaCode(user.id, String(formData.get("code") ?? ""), { forEnrollment: true });
  revalidatePath(BACK);
  go(r.ok ? "activat=1" : `pas=scanare&eroare=${encodeURIComponent(r.error)}`);
}

async function disableMfaAction__impl(formData: FormData) {
  const user = await account();
  const r = await checkMfaCode(user.id, String(formData.get("code") ?? ""));
  if (r.ok) await clearMfa(user.id);
  revalidatePath(BACK);
  go(r.ok ? "dezactivat=1" : `eroare=${encodeURIComponent(r.error)}`);
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const startMfaAction = auditedAction({ action: "household.securitate.startMfa", workspace: "household", resourceType: "securitate", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, startMfaAction__impl);
export const confirmMfaAction = auditedAction({ action: "household.securitate.confirmMfa", workspace: "household", resourceType: "securitate", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, confirmMfaAction__impl);
export const disableMfaAction = auditedAction({ action: "household.securitate.disableMfa", workspace: "household", resourceType: "securitate", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, disableMfaAction__impl);
