import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { assertContains, assertIndexed } from "./indexes";
import type { AuditRecord, DocumentStore, StoredAuditEvent, TransactStep } from "./store";

/**
 * Stocare minimală pe disc (JSON) pentru prima versiune.
 *
 * Este folosită doar în spatele interfețelor din `src/server/repositories`.
 * Pentru producție, înlocuiește implementarea repository-urilor cu una bazată
 * pe baza de date (schema este pregătită în `prisma/schema.prisma`) – restul
 * aplicației nu trebuie modificat.
 */
// Pe Vercel sistemul de fișiere e doar-citire, cu excepția /tmp (temporar).
const DATA_DIR =
  process.env.PUII_MEI_DATA_DIR ||
  (process.env.VERCEL ? "/tmp/puii-mei" : path.join(process.cwd(), ".data"));

const locks = new Map<string, Promise<unknown>>();

async function readCollection<T>(name: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw) as T[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeCollection<T>(name: string, items: T[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/** Serializează scrierile pe colecție pentru a evita pierderea datelor. */
function withLock<R>(name: string, fn: () => Promise<R>): Promise<R> {
  const prev = locks.get(name) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(name, next.catch(() => undefined));
  return next;
}

export const jsonStore: DocumentStore = {
  /** Fără anulare pe fișiere (doar dezvoltare locală): vezi DocumentStore.atomic. */
  atomic: <R>(fn: () => Promise<R>) => fn(),
  auditAppend(e: AuditRecord, hash: (prev: string | null, e: AuditRecord) => string) {
    return withLock("audit-events", async () => {
      const items = await readCollection<StoredAuditEvent>("audit-events");
      const prev = items.at(-1)?.eventHash ?? null;
      items.push({ ...e, seq: items.length + 1, prevHash: prev, eventHash: hash(prev, e), recordedAt: new Date().toISOString() });
      await writeCollection("audit-events", items);
    });
  },
  async auditList(f: { householdId?: string; actorId?: string; resourceId?: string; correlationId?: string; limit?: number }) {
    return (await readCollection<StoredAuditEvent>("audit-events"))
      .filter((e) => (!f.householdId || e.householdId === f.householdId) && (!f.actorId || e.actorId === f.actorId) && (!f.resourceId || e.resourceId === f.resourceId) && (!f.correlationId || e.correlationId === f.correlationId))
      .reverse()
      .slice(0, f.limit ?? 200);
  },
  list: readCollection,
  async findContaining<T>(name: string, field: string, item: Record<string, string>) {
    assertContains(name, field);
    return (await readCollection<T>(name)).filter((i) => {
      const list = (i as Record<string, unknown>)[field];
      return Array.isArray(list) && list.some((x) => Object.entries(item).every(([k, v]) => (x as Record<string, unknown>)?.[k] === v));
    });
  },
  async findBy<T>(name: string, field: string, values: string | string[]) {
    assertIndexed(name, field);
    const set = new Set((Array.isArray(values) ? values : [values]).filter((v) => v !== ""));
    return (await readCollection<T>(name)).filter((i) => set.has((i as Record<string, unknown>)[field] as string));
  },
  async get<T extends { id: string }>(name: string, id: string) {
    return (await readCollection<T>(name)).find((i) => i.id === id) ?? null;
  },
  append<T extends { id: string }>(name: string, item: T) {
    return withLock(name, async () => {
      const items = await readCollection<T>(name);
      items.push(item);
      await writeCollection(name, items);
      return item;
    });
  },
  update<T extends { id: string }>(name: string, id: string, patch: Partial<T>) {
    return withLock(name, async () => {
      const items = await readCollection<T>(name);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...patch };
      await writeCollection(name, items);
      return items[idx];
    });
  },
  transact<T extends { id: string }, R>(
    name: string,
    id: string,
    fn: (current: T | null) => Promise<TransactStep<T, R>> | TransactStep<T, R>,
    initial?: T,
  ) {
    return withLock(name, async () => {
      const items = await readCollection<T>(name);
      let idx = items.findIndex((i) => i.id === id);
      if (idx === -1 && initial) {
        items.push(initial);
        idx = items.length - 1;
      }
      const { patch, result } = await fn(idx === -1 ? null : items[idx]);
      if (idx !== -1 && (patch || initial)) {
        items[idx] = { ...items[idx], ...(patch ?? {}) };
        await writeCollection(name, items);
      }
      return result;
    });
  },
  remove(name: string, ids?: string[]) {
    return withLock(name, async () => {
      const items = await readCollection<{ id: string }>(name);
      const kept = ids ? items.filter((i) => !ids.includes(i.id)) : [];
      await writeCollection(name, kept);
      return items.length - kept.length;
    });
  },
};
