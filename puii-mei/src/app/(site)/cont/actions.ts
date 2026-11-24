"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { roleHome } from "@/lib/roles";
import { verifyPassword, hashPassword } from "@/server/password";
import { setupLinkValid, userRepository } from "@/server/repositories/users";
import { envAdmin, startSession } from "@/server/session";
import { safeEqual, sessionSecretReady } from "@/server/session-token";
import { safeInternalPath } from "@/lib/safe-return";
import { auditedAction } from "@/server/audit";

export type AuthFormState = { status: "idle" } | { status: "error"; message: string; email?: string };

/** Protecție simplă la încercări repetate (per instanță de server). */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function isLocked(key: string) {
  const a = attempts.get(key);
  return Boolean(a && a.count >= MAX_ATTEMPTS && a.until > Date.now());
}
function fail(key: string) {
  const a = attempts.get(key);
  const fresh = !a || a.until < Date.now();
  attempts.set(key, { count: fresh ? 1 : a!.count + 1, until: Date.now() + LOCK_MINUTES * 60_000 });
}

/** Acceptă doar adrese interne, ca redirecționarea să nu poată duce în afara site-ului. */
/** NAV-09: doar rute interne (refuză `//gazda`, `/\\gazda`, scheme, `..`). */
const safeReturn = (value: FormDataEntryValue | null) => safeInternalPath(value);

async function login__impl(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { status: "error", message: "Completează emailul și parola.", email };
  if (!sessionSecretReady()) {
    console.error("[puii-mei] Autentificare oprită: SESSION_SECRET lipsește sau e prea scurt.");
    return { status: "error", message: "Autentificarea e oprită temporar: platforma nu e configurată complet (SESSION_SECRET). Anunță administratorul.", email };
  }
  if (isLocked(email)) {
    return { status: "error", message: `Prea multe încercări. Încearcă din nou peste ${LOCK_MINUTES} minute.`, email };
  }

  const admin = envAdmin();
  let user = null;
  if (admin && email === admin.email && safeEqual(password, process.env.ADMIN_PASSWORD ?? "")) {
    user = admin;
  } else {
    const found = await userRepository.byEmail(email);
    if (found && found.status === "activ" && (await verifyPassword(password, found.passwordHash))) user = found;
  }
  if (!user) {
    fail(email);
    return { status: "error", message: "Email sau parolă greșită.", email };
  }

  attempts.delete(email);
  if (user.id !== "env-admin") await userRepository.update(user.id, { lastLoginAt: new Date().toISOString() });
  await startSession(user);
  redirect(safeReturn(formData.get("inapoi")) ?? roleHome[user.role]);
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Parola trebuie să aibă cel puțin 10 caractere.")
      .max(200, "Parola este prea lungă.")
      .regex(/[A-Za-zĂÂÎȘȚăâîșț]/, "Parola trebuie să conțină cel puțin o literă.")
      .regex(/\d/, "Parola trebuie să conțină cel puțin o cifră."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Parolele nu coincid.", path: ["confirm"] });

/** Setarea parolei din linkul de invitație / resetare. */
async function activateAccount__impl(token: string, _prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await userRepository.bySetupToken(token);
  if (!user || !setupLinkValid(user)) {
    return { status: "error", message: "Linkul nu mai este valid. Cere unul nou administratorului." };
  }
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const updated = await userRepository.update(user.id, {
    passwordHash: await hashPassword(parsed.data.password),
    status: "activ",
    sessionVersion: user.sessionVersion + 1,
    // Linkul se folosește o singură dată (valorile goale îl invalidează).
    setupToken: "",
    setupExpiresAt: "",
    lastLoginAt: new Date().toISOString(),
  });
  await startSession(updated ?? user);
  redirect(roleHome[user.role]);
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const login = auditedAction({ action: "public.cont.login", workspace: "public", resourceType: "cont", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, login__impl);
export const activateAccount = auditedAction({ action: "public.cont.activateAccount", workspace: "public", resourceType: "cont", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, activateAccount__impl);
