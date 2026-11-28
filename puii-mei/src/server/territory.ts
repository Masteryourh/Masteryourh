import "server-only";
import type { User } from "@/lib/domain";
import { farmRepository } from "./repositories/catalog";

/**
 * Teritoriul managerilor: managerul local are o comună, managerul zonal mai multe; adminul vede toate comunele.
 * Scope-ul se citește din contul utilizatorului (IAM, pe server), la fiecare cerere — nu din setări editabile.
 */
export async function communesFor(user: User): Promise<string[]> {
  if (user.role === "admin") {
    const all = (await farmRepository.listAll()).map((f) => f.commune).filter((c): c is string => Boolean(c));
    return [...new Set(all)].sort((a, b) => a.localeCompare(b, "ro"));
  }
  if (user.role === "manager-local" || user.role === "manager-zonal") return [...(user.communes ?? [])];
  return [];
}

/** Gospodăriile active din comunele managerului. */
export async function farmsInScope(user: User) {
  const communes = new Set(await communesFor(user));
  return (await farmRepository.list()).filter((f) => f.commune && communes.has(f.commune));
}
