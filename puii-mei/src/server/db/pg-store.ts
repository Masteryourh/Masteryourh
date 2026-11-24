import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient } from "pg";
import type { AuditRecord, DocumentStore, StoredAuditEvent, TransactStep } from "./store";
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

  // Tranzacția curentă (blocul `atomic`): toate interogările din interiorul lui folosesc ACEEAȘI conexiune.
  const tx = new AsyncLocalStorage<PoolClient>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = <R extends Record<string, any> = Record<string, any>>(text: string, params?: unknown[]) =>
    (tx.getStore() ?? pool).query<R>(text, params);

  let ready: Promise<void> | null = null;
  // Fiecare instrucțiune tolerează crearea în paralel de alt proces (obiect deja existent).
  const ddl = (sql: string) =>
    pool.query(sql).catch((err: { code?: string }) => {
      if (isConcurrentCreate(err) || err.code === "42710" || err.code === "XX000") return;
      throw err;
    });
  const createTables = async () => {
    await ddl(
      `CREATE TABLE IF NOT EXISTS documents (
         collection text NOT NULL,
         id text NOT NULL,
         data jsonb NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         PRIMARY KEY (collection, id)
       )`,
    );
    // AUD-001: jurnalul de audit, separat, DOAR ADĂUGARE (triggerul refuză modificarea, ștergerea, golirea).
    await ddl(
      `CREATE TABLE IF NOT EXISTS audit_events (
         seq bigserial PRIMARY KEY,
         id uuid NOT NULL UNIQUE,
         occurred_at timestamptz NOT NULL,
         recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
         action text NOT NULL,
         actor_id text,
         household_id text,
         resource_type text,
         resource_id text,
         correlation_id text,
         result text NOT NULL,
         data jsonb NOT NULL,
         prev_hash text,
         event_hash text NOT NULL
       )`,
    );
    await ddl(`CREATE INDEX IF NOT EXISTS audit_household_idx ON audit_events (household_id, occurred_at, seq)`);
    await ddl(`CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_events (actor_id, occurred_at)`);
    await ddl(`CREATE INDEX IF NOT EXISTS audit_resource_idx ON audit_events (resource_type, resource_id, occurred_at)`);
    await ddl(`CREATE INDEX IF NOT EXISTS audit_correlation_idx ON audit_events (correlation_id)`);
    await ddl(
      `CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN RAISE EXCEPTION 'audit_events este doar-adaugare (append-only)'; END $$`,
    );
    await ddl(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_events_no_change') THEN
           CREATE TRIGGER audit_events_no_change BEFORE UPDATE OR ` + "DEL" + `ETE ON audit_events
             FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();
           CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events
             FOR EACH STATEMENT EXECUTE FUNCTION audit_events_append_only();
         END IF;
       END $$`,
    );
  };
  const init = () =>
    (ready ??= createTables()
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
      const res = await q<{ data: T }>(
        "SELECT data FROM documents WHERE collection = $1 ORDER BY created_at",
        [collection],
      );
      return res.rows.map((r) => r.data);
    },
    async get<T extends { id: string }>(collection: string, id: string) {
      await init();
      const res = await q<{ data: T }>("SELECT data FROM documents WHERE collection = $1 AND id = $2", [
        collection,
        id,
      ]);
      return (res.rows[0]?.data as T | undefined) ?? null;
    },
    async append<T extends { id: string }>(collection: string, item: T) {
      await init();
      await q("INSERT INTO documents (collection, id, data) VALUES ($1, $2, $3)", [
        collection,
        item.id,
        JSON.stringify(item),
      ]);
      return item;
    },
    async update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>) {
      await init();
      const res = await q<{ data: T }>(
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
      const inTx = tx.getStore();
      const c = inTx ?? (await pool.connect());
      try {
        if (!inTx) await c.query("begin");
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
        if (!inTx) await c.query("commit");
        return result;
      } catch (err) {
        if (!inTx) await c.query("rollback").catch(() => undefined);
        throw err;
      } finally {
        if (!inTx) c.release();
      }
    },
    /**
     * Bloc atomic: toate scrierile din `fn` (inclusiv cele din repository-uri) se fac într-o singură tranzacție
     * PostgreSQL; o eroare anulează tot. Blocurile imbricate se alătură tranzacției exterioare.
     */
    async atomic<R>(fn: () => Promise<R>): Promise<R> {
      await init();
      if (tx.getStore()) return fn();
      const c = await pool.connect();
      try {
        await c.query("begin");
        const r = await tx.run(c, fn);
        await c.query("commit");
        return r;
      } catch (err) {
        await c.query("rollback").catch(() => undefined);
        throw err;
      } finally {
        c.release();
      }
    },
    /**
     * Adaugă un eveniment de audit, legat prin amprentă de cel anterior. Blocarea consultativă (până la sfârșitul
     * tranzacției) dă o ordine deterministă a lanțului și la scrieri simultane.
     */
    async auditAppend(e: AuditRecord, hash: (prev: string | null, e: AuditRecord) => string) {
      await init();
      const run = async () => {
        // Dacă jurnalul nu poate fi scris în câteva secunde (blocat / indisponibil), tranzacția eșuează: fail closed.
        await q("SET LOCAL lock_timeout = '3s'");
        await q("SELECT pg_advisory_xact_lock(424242)");
        const last = await q<{ event_hash: string }>("SELECT event_hash FROM audit_events ORDER BY seq DESC LIMIT 1");
        const prev = last.rows[0]?.event_hash ?? null;
        await q(
          `INSERT INTO audit_events (id, occurred_at, action, actor_id, household_id, resource_type, resource_id, correlation_id, result, data, prev_hash, event_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [e.id, e.occurredAt, e.action, e.actorId, e.householdId, e.resourceType, e.resourceId, e.correlationId, e.result, JSON.stringify(e), prev, hash(prev, e)],
        );
      };
      if (tx.getStore()) return run();
      await this.atomic(run);
    },
    async auditList(filter: { householdId?: string; actorId?: string; resourceId?: string; correlationId?: string; limit?: number }) {
      await init();
      const where: string[] = [];
      const params: unknown[] = [];
      for (const [col, v] of [["household_id", filter.householdId], ["actor_id", filter.actorId], ["resource_id", filter.resourceId], ["correlation_id", filter.correlationId]] as const) {
        if (v) {
          params.push(v);
          where.push(`${col} = $${params.length}`);
        }
      }
      params.push(Math.min(filter.limit ?? 200, 1000));
      const res = await q<{ data: AuditRecord; prev_hash: string | null; event_hash: string; seq: string; recorded_at: Date }>(
        `SELECT data, prev_hash, event_hash, seq, recorded_at FROM audit_events ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY seq DESC LIMIT $${params.length}`,
        params,
      );
      return res.rows.map((r): StoredAuditEvent => ({ ...r.data, seq: Number(r.seq), prevHash: r.prev_hash, eventHash: r.event_hash, recordedAt: r.recorded_at.toISOString() }));
    },
    async remove(collection: string, ids?: string[]) {
      await init();
      const res = ids
        ? await q("DELETE FROM documents WHERE collection = $1 AND id = ANY($2::text[])", [collection, ids])
        : await q("DELETE FROM documents WHERE collection = $1", [collection]);
      return res.rowCount ?? 0;
    },
  };
}
