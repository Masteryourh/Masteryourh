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
  /**
   * Documentele cu `data[field]` egal cu una dintre `values`, în ordinea creării, citite prin index (fără citirea
   * întregii colecții). Doar perechile din `indexes.ts` (altfel eroare).
   */
  findBy<T>(collection: string, field: string, values: string | string[]): Promise<T[]>;
  /** Documentele al căror câmp-listă `field` conține un element care include `item` (index GIN, vezi indexes.ts). */
  findContaining<T>(collection: string, field: string, item: Record<string, string>): Promise<T[]>;
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
  /**
   * O pagină dintr-o colecție, cele mai noi întâi (după momentul creării). `after`: cursorul întors de pagina anterioară.
   */
  page<T>(collection: string, opts: { limit: number; after?: string | null }): Promise<{ items: T[]; next: string | null }>;
  /**
   * Agregare calculată în baza de date (fără transferul documentelor): număr și sume, opțional pe grupe și cu excluderi.
   * Câmpurile pot avea un nivel de imbricare (`estimate.total`).
   */
  aggregate(
    collection: string,
    opts: { sum: string[]; groupBy?: string; exclude?: { field: string; values: string[] } },
  ): Promise<Array<{ key: string | null; count: number; sums: Record<string, number> }>>;
  /** Șterge documente: toată colecția sau doar id-urile date. Întoarce câte s-au șters. */
  remove(collection: string, ids?: string[]): Promise<number>;
  /**
   * Diagnostic: `n` drumuri dus-întors minime (`SELECT 1`) către bază, fiecare măsurat separat, în ms. Măsoară latența
   * reală aplicație ↔ bază (rețea + server), fără date.
   */
  ping(n: number): Promise<number[]>;
  /**
   * Bloc atomic (AUD-001): pe PostgreSQL, toate scrierile din `fn` sunt o singură tranzacție (o eroare anulează tot).
   * Pe fișiere JSON (doar dezvoltare locală) NU există anulare: scrierile făcute înainte de eroare rămân.
   */
  atomic<R>(fn: () => Promise<R>): Promise<R>;
  /**
   * Rulează `fn` după commit-ul tranzacției curente (outbox: efectele externe după commit); la anulare nu rulează.
   * În afara unei tranzacții rulează imediat. Erorile din `fn` nu afectează tranzacția (deja confirmată).
   */
  afterCommit(fn: () => Promise<void>): Promise<void>;
  /** Jurnalul de audit, doar adăugare, cu lanț de amprente (vezi src/server/audit.ts). */
  auditAppend(e: AuditRecord, hash: (prev: string | null, e: AuditRecord) => string): Promise<void>;
  auditList(filter: { householdId?: string; actorId?: string; resourceId?: string; correlationId?: string; limit?: number }): Promise<StoredAuditEvent[]>;
}

/** Evenimentul de audit (AUD-001), deja redactat: fără parole, PIN-uri, tokenuri, IBAN în clar. */
export type AuditRecord = {
  id: string;
  schemaVersion: 1;
  occurredAt: string;
  action: string;
  result: "ok" | "refuzat" | "eroare";
  actorType: "human" | "system" | "client" | "courier";
  actorId: string | null;
  actorRole: string | null;
  onBehalfOfHouseholdId: string | null;
  workspace: string;
  sourceKind: "web" | "job" | "system";
  householdId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  correlationId: string;
  requestId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  reason: string | null;
  changes: Record<string, unknown> | null;
  unavailable: string[];
};
export type StoredAuditEvent = AuditRecord & { seq: number; prevHash: string | null; eventHash: string; recordedAt: string };

export type TransactStep<T, R> = { patch?: Partial<T>; result: R };

export const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const store: DocumentStore = databaseUrl ? pgStore(databaseUrl) : jsonStore;

export const storageKind = databaseUrl ? "postgres" : process.env.VERCEL ? "temporar" : "fisier";
