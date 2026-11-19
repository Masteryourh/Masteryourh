import "server-only";
import type { User, UserRole } from "@/lib/domain";
import { getCurrentUser } from "./session";

/**
 * Verificări de acces pentru server actions și route handlers (pe lângă proxy,
 * care redirecționează paginile protejate spre autentificare).
 */
export async function requireRole(roles: UserRole[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && !roles.includes(user.role))) throw new Error("Neautorizat");
  return user;
}

/** Doar administratorii. */
export async function requireAdmin(): Promise<User> {
  return requireRole(["admin"]);
}
