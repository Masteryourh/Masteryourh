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
  /**
   * Citire-modificare-scriere ATOMICĂ pe un document (blocare pe rând în PostgreSQL / pe colecție în fișiere).
   * `fn` primește documentul curent (sau `initial`, inserat dacă lipsește) și întoarce modificarea + rezultatul.
   * Folosit pentru contoare de securitate (încercări de PIN, limite de rată), unde cererile simultane nu au voie
   * să piardă actualizări.
   */
  transact<T extends { id: string }, R>(
    collection: string,
    id: string,
    fn: (current: T | null) => Promise<TransactStep<T, R>> | TransactStep<T, R>,
    initial?: T,
  ): Promise<R>;
  /** Șterge documente: toată colecția sau doar id-urile date. Întoarce câte s-au șters. */
  remove(collection: string, ids?: string[]): Promise<number>;
}

export type TransactStep<T, R> = { patch?: Partial<T>; result: R };

export const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const store: DocumentStore = databaseUrl ? pgStore(databaseUrl) : jsonStore;

export const storageKind = databaseUrl ? "postgres" : process.env.VERCEL ? "temporar" : "fisier";
