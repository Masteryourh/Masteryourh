import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { User, UserRole } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "users";
/** Câte zile e valabil linkul de invitație / resetare. */
export const SETUP_LINK_DAYS = 7;

const normEmail = (e: string) => e.trim().toLowerCase();

/** Linkul de activare / resetare există și nu a expirat. */
export function setupLinkValid(u: Pick<User, "setupToken" | "setupExpiresAt" | "status">) {
  return Boolean(
    u.setupToken && u.setupExpiresAt && u.status !== "dezactivat" && new Date(u.setupExpiresAt).getTime() > Date.now(),
  );
}

/** Token nou de setare a parolei (invitație sau resetare). */
export function newSetupLink() {
  return {
    setupToken: randomBytes(24).toString("base64url"),
    setupExpiresAt: new Date(Date.now() + SETUP_LINK_DAYS * 86400_000).toISOString(),
  };
}

export const userRepository = {
  async list() {
    const items = await store.list<User>(COLLECTION);
    return items.sort((a, b) => a.name.localeCompare(b.name, "ro"));
  },
  async byId(id: string) {
    return store.get<User>(COLLECTION, id);
  },
  async byEmail(email: string) {
    const e = normEmail(email);
    return (await store.findBy<User>(COLLECTION, "email", e))[0] ?? null;
  },
  /** Autentificare cu nume de utilizator (ex. „ionut”), fără e-mail. */
  async byUsername(username: string) {
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,40}$/.test(u)) return null;
    return (await store.findBy<User>(COLLECTION, "username", u))[0] ?? null;
  },
  async bySetupToken(token: string) {
    if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
    return (await store.findBy<User>(COLLECTION, "setupToken", token))[0] ?? null;
  },
  /** Conturile legate de o gospodărie (gospodari), fără citirea tuturor utilizatorilor. */
  async byFarm(slug: string) {
    return store.findBy<User>(COLLECTION, "farmSlug", slug);
  },
  async create(data: { email: string; name: string; phone: string; role: UserRole; farmSlug?: string }) {
    const user: User = {
      id: randomUUID(),
      email: normEmail(data.email),
      name: data.name.trim(),
      phone: data.phone.trim(),
      role: data.role,
      ...(data.role === "gospodar" && data.farmSlug ? { farmSlug: data.farmSlug } : {}),
      status: "invitat",
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
      ...newSetupLink(),
    };
    return store.append(COLLECTION, user);
  },
  /** Ștergere definitivă (sesiunile lui devin invalide: contul nu mai există). */
  remove: (id: string) => store.remove(COLLECTION, [id]),
  async update(id: string, patch: Partial<User>) {
    return store.update<User>(COLLECTION, id, patch);
  },
};
