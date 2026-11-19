import "server-only";
import { Pool } from "pg";
import type { DocumentStore } from "./store";

/**
 * Stocare PostgreSQL: un tabel `documents` cu date JSONB, creat automat.
 * Simplu și robust pentru prima versiune; schema relațională completă
 * (prisma/schema.prisma) poate înlocui acest strat ulterior.
 */
export function pgStore(connectionString: string): DocumentStore {
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString) || connectionString.includes("host=/");
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
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
      .catch((err) => {
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
        [collection, id, JSON.stringify(patch)],
      );
      return res.rows[0]?.data ?? null;
    },
  };
}
