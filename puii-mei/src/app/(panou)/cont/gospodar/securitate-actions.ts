"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { checkMfaCode, clearMfa, mfaEnabled, startMfaEnrollment } from "@/server/mfa";
import { ENV_ADMIN_ID } from "@/server/session";

const BACK = "/cont/gospodar/securitate";
const go = (q: string) => redirect(`${BACK}?${q}`);

async function account() {
  const user = await requireRole(["gospodar"]);
  if (user.id === ENV_ADMIN_ID) go(`eroare=${encodeURIComponent("Contul de administrator din variabilele de mediu nu poate avea cod de confirmare.")}`);
  return user;
}

export async function startMfaAction() {
  const user = await account();
  if (!mfaEnabled(user)) await startMfaEnrollment(user);
  revalidatePath(BACK);
  go("pas=scanare");
}

export async function confirmMfaAction(formData: FormData) {
  const user = await account();
  const r = await checkMfaCode(user.id, String(formData.get("code") ?? ""), { forEnrollment: true });
  revalidatePath(BACK);
  go(r.ok ? "activat=1" : `pas=scanare&eroare=${encodeURIComponent(r.error)}`);
}

export async function disableMfaAction(formData: FormData) {
  const user = await account();
  const r = await checkMfaCode(user.id, String(formData.get("code") ?? ""));
  if (r.ok) await clearMfa(user.id);
  revalidatePath(BACK);
  go(r.ok ? "dezactivat=1" : `eroare=${encodeURIComponent(r.error)}`);
}
