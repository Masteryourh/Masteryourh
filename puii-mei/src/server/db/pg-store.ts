import "server-only";
import { Pool } from "pg";
import type { DocumentStore, TransactStep } from "./store";
import { pgSslConfig } from "./pg-ssl";

/**
 * Stocare PostgreSQL: un tabel `documents` cu date JSONB, creat automat.
 * Simplu și robust pentru prima versiune; schema relațională completă
 * (prisma/schema.prisma) poate înlocui acest strat ulterior.
 */
/** Eroarea apărută când alt proces a creat același tabel în paralel. */
export function isConcurrentCreate(err: { code?: string } | null | undefined) {
  return err?.code === "23505" || err?.code === "42P07";
}

export function pgStore(connectionString: string): DocumentStore {
  const pool = new Pool({
    connectionString,
    // Certificatul serverului se verifică mereu (fără `rejectUnauthorized: false`).
    ssl: pgSslConfig(connectionString),
    max: 3,
  });

  let ready: Promise<void> | null = null;
  const init = () =>
    (ready ??= pool
      .query(
        `CREATE TABLE IF NOT EXISTS documents (
           collection text NOT NULL,
           id text NOT NULL,
           data jsonb NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now(),
           PRIMARY KEY (collection, id)
         )`,
      )
      .then(() => undefined)
      .catch((err: { code?: string }) => {
        // Mai multe procese (ex. build-ul paralel) pot crea tabelul în același timp pe o bază nouă:
        // Postgres răspunde cu 23505 (pg_type) sau 42P07 (tabel existent). Tabelul există, deci e în regulă.
        if (isConcurrentCreate(err)) return undefined;
        ready = null;
        throw err;
      }));

  return {
    async list<T>(collection: string) {
      await init();
      const res = await pool.query<{ data: T }>(
        "SELECT data FROM documents WHERE collection = $1 ORDER BY created_at",
        [collection],
      );
      return res.rows.map((r) => r.data);
    },
    async get<T extends { id: string }>(collection: string, id: string) {
      await init();
      const res = await pool.query<{ data: T }>("SELECT data FROM documents WHERE collection = $1 AND id = $2", [
        collection,
        id,
      ]);
      return (res.rows[0]?.data as T | undefined) ?? null;
    },
    async append<T extends { id: string }>(collection: string, item: T) {
      await init();
      await pool.query("INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3)", [
        collection,
        item.id,
        JSON.stringify(item),
      ]);
      return item;
    },
    async update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>) {
      await init();
      const res = await pool.query<{ data: T }>(
        "UPDATE documents SET data = data || $3::jsonb WHERE collection = $1 AND id = $2 RETURNING data",
        // Câmpurile setate pe `undefined` se șterg (devin null), ca în stocarea în fișiere.
        [collection, id, JSON.stringify(patch, (_k, v) => (v === undefined ? null : v))],
      );
      return res.rows[0]?.data ?? null;
    },
    async transact<T extends { id: string }, R>(
      collection: string,
      id: string,
      fn: (current: T | null) => Promise<TransactStep<T, R>> | TransactStep<T, R>,
      initial?: T,
    ) {
      await init();
      const c = await pool.connect();
      try {
        await c.query("begin");
        if (initial) {
          await c.query("insert into documents (collection, id, data) values ($1, $2, $3) on conflict do nothing", [collection, id, JSON.stringify(initial)]);
        }
        const res = await c.query<{ data: T }>("select data from documents where collection = $1 and id = $2 for update", [collection, id]);
        const { patch, result } = await fn(res.rows[0]?.data ?? null);
        if (patch && res.rows[0]) {
          await c.query("update documents set data = data || $3::jsonb where collection = $1 and id = $2", [
            collection,
            id,
            JSON.stringify(patch, (_k, v) => (v === undefined ? null : v)),
          ]);
        }
        await c.query("commit");
        return result;
      } catch (err) {
        await c.query("rollback").catch(() => undefined);
        throw err;
      } finally {
        c.release();
      }
    },
    async remove(collection: string, ids?: string[]) {
      await init();
      const res = ids
        ? await pool.query("DELETE FROM documents WHERE collection = $1 AND id = ANY($2::text[])", [collection, ids])
        : await pool.query("DELETE FROM documents WHERE collection = $1", [collection]);
      return res.rowCount ?? 0;
    },
  };
}
