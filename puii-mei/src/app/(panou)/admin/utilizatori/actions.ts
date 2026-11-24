"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@/lib/domain";
import { emailSchema, nameSchema } from "@/lib/validation/common";
import { requireAdmin } from "@/server/auth";
import { farmRepository } from "@/server/repositories/catalog";
import { newSetupLink, userRepository } from "@/server/repositories/users";
import { auditedAction } from "@/server/audit";

export type UserFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | { status: "success"; name: string };

const createSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: z.string().trim().max(20).default(""),
    role: z.enum(["admin", "gospodar", "investitor"], { message: "Alege rolul." }),
    farmSlug: z.string().trim().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.role === "gospodar" && !d.farmSlug) {
      ctx.addIssue({ code: "custom", path: ["farmSlug"], message: "Alege gospodăria administrată." });
    }
  });

async function createUser__impl(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { status: "error", errors, values: raw };
  }
  const d = parsed.data;
  if (await userRepository.byEmail(d.email)) {
    return { status: "error", errors: { email: "Există deja un cont cu acest email." }, values: raw };
  }
  if (d.role === "gospodar" && !(await farmRepository.bySlug(d.farmSlug, { includeInactive: true }))) {
    return { status: "error", errors: { farmSlug: "Gospodăria nu există." }, values: raw };
  }
  await userRepository.create({ ...d, role: d.role as UserRole });
  revalidatePath("/admin/utilizatori");
  return { status: "success", name: d.name };
}

/** Link nou de setare a parolei (invitație retrimisă sau parolă uitată). */
async function regenerateLink__impl(formData: FormData) {
  await requireAdmin();
  const user = await userRepository.byId(String(formData.get("id") ?? ""));
  if (!user) throw new Error("Contul nu există");
  await userRepository.update(user.id, newSetupLink());
  revalidatePath("/admin/utilizatori");
}

/** Dezactivare / reactivare. Dezactivarea închide imediat toate sesiunile contului. */
async function toggleUserStatus__impl(formData: FormData) {
  const me = await requireAdmin();
  const user = await userRepository.byId(String(formData.get("id") ?? ""));
  if (!user) throw new Error("Contul nu există");
  if (user.id === me.id) throw new Error("Nu îți poți dezactiva propriul cont");
  const disable = user.status !== "dezactivat";
  await userRepository.update(user.id, {
    status: disable ? "dezactivat" : user.passwordHash ? "activ" : "invitat",
    sessionVersion: user.sessionVersion + 1,
  });
  revalidatePath("/admin/utilizatori");
}

/**
 * Resetarea codului de confirmare (MFA) — telefon pierdut, după verificarea identității prin telefon. Închide și
 * sesiunile contului; utilizatorul activează din nou codul din pagina Securitate.
 */
async function resetUserMfa__impl(formData: FormData) {
  await requireAdmin();
  const user = await userRepository.byId(String(formData.get("id") ?? ""));
  if (!user) throw new Error("Contul nu există");
  await userRepository.update(user.id, { mfa: undefined, sessionVersion: user.sessionVersion + 1 });
  revalidatePath("/admin/utilizatori");
}

/** Ștergerea definitivă a unui cont (nu și a propriului cont). */
async function deleteUser__impl(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) throw new Error("Nu îți poți șterge propriul cont.");
  const user = await userRepository.byId(id);
  if (!user) return;
  await userRepository.remove(id);
  console.info(`[puii-mei] Cont șters de ${admin.name}: ${user.email}`);
  revalidatePath("/admin/utilizatori");
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const createUser = auditedAction({ action: "admin.utilizatori.createUser", workspace: "admin", resourceType: "utilizatori", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, createUser__impl);
export const regenerateLink = auditedAction({ action: "admin.utilizatori.regenerateLink", workspace: "admin", resourceType: "utilizatori", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, regenerateLink__impl);
export const toggleUserStatus = auditedAction({ action: "admin.utilizatori.toggleUserStatus", workspace: "admin", resourceType: "utilizatori", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, toggleUserStatus__impl);
export const resetUserMfa = auditedAction({ action: "admin.utilizatori.resetUserMfa", workspace: "admin", resourceType: "utilizatori", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, resetUserMfa__impl);
export const deleteUser = auditedAction({ action: "admin.utilizatori.deleteUser", workspace: "admin", resourceType: "utilizatori", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, deleteUser__impl);
