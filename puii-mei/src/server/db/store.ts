import "server-only";
import { jsonStore } from "./json-store";
import { pgStore } from "./pg-store";

/**
 * Stocare de documente folosită de repository-uri.
 *
 * - Dacă există DATABASE_URL (sau POSTGRES_URL, setat automat de integrarea
 *   Neon / Vercel Postgres), datele se salvează în PostgreSQL – persistent.
 * - Altfel, în fișiere JSON locale (dezvoltare) sau în /tmp pe Vercel (temporar).
 */
export interface DocumentStore {
  list<T>(collection: string): Promise<T[]>;
  get<T extends { id: string }>(collection: string, id: string): Promise<T | null>;
  append<T extends { id: string }>(collection: string, item: T): Promise<T>;
  update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): Promise<T | null>;
  /** Șterge documente: toată colecția sau doar id-urile date. Întoarce câte s-au șters. */
  remove(collection: string, ids?: string[]): Promise<number>;
}

export const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const store: DocumentStore = databaseUrl ? pgStore(databaseUrl) : jsonStore;

export const storageKind = databaseUrl ? "postgres" : process.env.VERCEL ? "temporar" : "fisier";
