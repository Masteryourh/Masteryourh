"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@/lib/domain";
import { emailSchema, nameSchema } from "@/lib/validation/common";
import { requireAdmin } from "@/server/auth";
import { farmRepository } from "@/server/repositories/catalog";
import { newSetupLink, userRepository } from "@/server/repositories/users";

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

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
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
export async function regenerateLink(formData: FormData) {
  await requireAdmin();
  const user = await userRepository.byId(String(formData.get("id") ?? ""));
  if (!user) throw new Error("Contul nu există");
  await userRepository.update(user.id, newSetupLink());
  revalidatePath("/admin/utilizatori");
}

/** Dezactivare / reactivare. Dezactivarea închide imediat toate sesiunile contului. */
export async function toggleUserStatus(formData: FormData) {
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

/** Ștergerea definitivă a unui cont (nu și a propriului cont). */
export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) throw new Error("Nu îți poți șterge propriul cont.");
  const user = await userRepository.byId(id);
  if (!user) return;
  await userRepository.remove(id);
  console.info(`[puii-mei] Cont șters de ${admin.name}: ${user.email}`);
  revalidatePath("/admin/utilizatori");
}
