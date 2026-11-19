import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DocumentStore } from "./store";

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
  list: readCollection,
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
};
