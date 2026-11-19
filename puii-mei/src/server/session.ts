import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User, UserRole } from "@/lib/domain";
import { SESSION_COOKIE, SESSION_DAYS, decodeSession, encodeSession } from "./session-token";
import { userRepository } from "./repositories/users";

/** Administratorul definit prin variabilele de mediu (ADMIN_USER / ADMIN_PASSWORD). */
export const ENV_ADMIN_ID = "env-admin";

export function envAdmin(): User | null {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) return null;
  return {
    id: ENV_ADMIN_ID,
    email: process.env.ADMIN_USER.trim().toLowerCase(),
    name: "Administrator",
    phone: "",
    role: "admin",
    status: "activ",
    sessionVersion: 1,
    createdAt: "",
  };
}

/** Utilizatorul autentificat (verifică semnătura, versiunea sesiunii și statusul contului). */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const payload = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  if (payload.uid === ENV_ADMIN_ID) return envAdmin();
  const user = await userRepository.byId(payload.uid);
  if (!user || user.status !== "activ" || user.sessionVersion !== payload.v || user.role !== payload.role) return null;
  return user;
}

export async function startSession(user: User) {
  const jar = await cookies();
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  jar.set(SESSION_COOKIE, encodeSession({ uid: user.id, role: user.role, v: user.sessionVersion, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Cere un utilizator cu unul dintre roluri. Adminul are acces peste tot.
 * Fără sesiune validă → pagina de autentificare.
 */
export async function requireUser(roles: UserRole[], returnTo?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/cont/autentificare${returnTo ? `?inapoi=${encodeURIComponent(returnTo)}` : ""}`);
  if (user.role !== "admin" && !roles.includes(user.role)) redirect("/cont");
  return user;
}
