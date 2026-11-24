import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { store, type AuditRecord } from "./db/store";
import { eventHash, redact } from "./audit-core";
import { getCurrentUser } from "./session";
import { keyedHash, sessionSecretReady } from "./session-token";

/**
 * AUD-001 — serviciul central de audit.
 * - Actorul, rolul și gospodăria lui se iau din SESIUNE, pe server (AUD-INV-02), niciodată din formular.
 * - `workspace` e fixat în cod, de acțiunea care rulează (Admin rămâne Admin chiar dacă lucrează pe o gospodărie).
 * - Acțiunile modificatoare: modificarea și evenimentul de audit se scriu în ACEEAȘI tranzacție (`store.atomic`):
 *   dacă auditul nu se poate scrie, modificarea se anulează (AUD-INV-01, fail closed). Pe stocarea în fișiere
 *   (doar dezvoltare) nu există anulare.
 * - Refuzurile și erorile se scriu separat, după anularea tranzacției (evenimente de securitate).
 */
export type Workspace = "admin" | "household" | "customer" | "courier" | "public" | "system";
export type AuditMeta = {
  action: string;
  workspace: Workspace;
  resourceType: string;
  /** Câmpurile din formular care se păstrează (redactate). Restul nu ajung în audit. */
  fields?: string[];
  actorType?: AuditRecord["actorType"];
};
type Note = Partial<Pick<AuditRecord, "householdId" | "resourceId" | "reason" | "onBehalfOfHouseholdId">> & { changes?: Record<string, unknown> };

const notes = new AsyncLocalStorage<Note>();

/** Completează evenimentul acțiunii în curs (ex. gospodăria aflată după citirea obiectului). */
export function auditNote(n: Note) {
  const cur = notes.getStore();
  if (cur) Object.assign(cur, n, n.changes ? { changes: { ...(cur.changes ?? {}), ...n.changes } } : {});
}

const isNextControlFlow = (e: unknown) =>
  typeof (e as { digest?: unknown })?.digest === "string" && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test((e as { digest: string }).digest);

async function requestContext() {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
    return {
      requestId: h.get("x-vercel-id") ?? h.get("x-request-id") ?? null,
      // IP-ul e dată personală: se păstrează doar pseudonimizat (amprentă cu cheie), suficient pentru corelare.
      ipHash: ip && sessionSecretReady() ? keyedHash("audit-ip", ip).slice(0, 32) : null,
      userAgent: h.get("user-agent")?.slice(0, 200) ?? null,
    };
  } catch {
    return { requestId: null, ipHash: null, userAgent: null };
  }
}

function formFacts(args: unknown[], fields: string[] = []) {
  const fd = args.find((a): a is FormData => typeof FormData !== "undefined" && a instanceof FormData);
  if (!fd) return { householdId: null, resourceId: null, changes: null };
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" && v ? v.slice(0, 120) : null;
  };
  const present = fields.filter((k) => fd.has(k) && fd.get(k) !== "");
  const changes = present.length ? (redact(Object.fromEntries(present.map((k) => [k, fd.get(k)]))) as Record<string, unknown>) : null;
  return {
    householdId: get("farmSlug"),
    resourceId: get("id") ?? get("code") ?? get("tourId") ?? get("changeId") ?? get("lotCode") ?? get("preorderId"),
    changes,
  };
}

async function build(meta: AuditMeta, result: AuditRecord["result"], note: Note, facts: ReturnType<typeof formFacts>, correlationId: string, reason?: string): Promise<AuditRecord> {
  const [user, req] = await Promise.all([getCurrentUser().catch(() => null), requestContext()]);
  const householdId = note.householdId ?? facts.householdId ?? null;
  const unavailable: string[] = [];
  if (!user && meta.actorType !== "system") unavailable.push("actor_id: fără cont (client / curier / public)");
  if (!req.requestId) unavailable.push("request_id: antet lipsă");
  return {
    id: randomUUID(),
    schemaVersion: 1,
    occurredAt: new Date().toISOString(),
    action: meta.action,
    result,
    actorType: user ? "human" : (meta.actorType ?? "client"),
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    // Un admin care lucrează pe o gospodărie o face în numele ei, ca admin (fără impersonare).
    onBehalfOfHouseholdId: note.onBehalfOfHouseholdId ?? (user?.role === "admin" ? householdId : null),
    workspace: meta.workspace,
    sourceKind: meta.workspace === "system" ? "job" : "web",
    householdId,
    resourceType: meta.resourceType,
    resourceId: note.resourceId ?? facts.resourceId ?? null,
    correlationId,
    ...req,
    reason: reason ?? note.reason ?? null,
    changes: facts.changes || note.changes ? (redact({ ...(facts.changes ?? {}), ...(note.changes ?? {}) }) as Record<string, unknown>) : null,
    unavailable,
  };
}

export const appendAudit = (e: AuditRecord) => store.auditAppend(e, eventHash);

/**
 * Rulează o acțiune modificatoare cu audit în aceeași tranzacție. Redirecționările Next (rezultat normal al
 * acțiunilor) confirmă tranzacția; orice altă eroare o anulează și lasă un eveniment de securitate separat.
 */
export async function audited<R>(meta: AuditMeta, args: unknown[], fn: () => Promise<R>): Promise<R> {
  const note: Note = {};
  const facts = formFacts(args, meta.fields);
  const correlationId = randomUUID();
  let flow: unknown = null;
  try {
    const r = await notes.run(note, () =>
      store.atomic(async () => {
        let out: R | undefined;
        try {
          out = await fn();
        } catch (e) {
          if (!isNextControlFlow(e)) throw e;
          flow = e;
        }
        // O acțiune care ÎNTOARCE o eroare (în loc s-o arunce), ex. „PIN greșit”, e un refuz, nu un succes.
        const ret = out as { status?: unknown; ok?: unknown; error?: unknown; message?: unknown } | undefined;
        const refused = Boolean(ret && typeof ret === "object" && (ret.status === "error" || ret.ok === false));
        const why = refused ? String(ret!.error ?? ret!.message ?? "refuzat").slice(0, 200) : undefined;
        await appendAudit(await build(meta, refused ? "refuzat" : "ok", note, facts, correlationId, why));
        return out as R;
      }),
    );
    if (flow) throw flow;
    return r;
  } catch (e) {
    if (e === flow) throw e;
    const msg = e instanceof Error ? e.message : "eroare";
    const refused = /neautorizat|nu ai acces|nu poți|refuz/i.test(msg);
    await appendAudit(await build(meta, refused ? "refuzat" : "eroare", note, facts, correlationId, msg.slice(0, 200))).catch((err) =>
      console.error("[puii-mei] Evenimentul de securitate nu a putut fi scris", err),
    );
    throw e;
  }
}

/** Învelește o acțiune de server existentă (fără a-i schimba codul). */
export function auditedAction<A extends unknown[], R>(meta: AuditMeta, impl: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => audited(meta, args, () => impl(...args));
}

/** Eveniment fără modificare de date (ex. PIN greșit, acces refuzat), scris imediat. */
export async function securityEvent(meta: AuditMeta, result: AuditRecord["result"], note: Note = {}, reason?: string) {
  await appendAudit(await build(meta, result, note, { householdId: null, resourceId: null, changes: null }, randomUUID(), reason)).catch((err) =>
    console.error("[puii-mei] Evenimentul de securitate nu a putut fi scris", err),
  );
}

/** Acțiune a sistemului (job zilnic, activare automată), în tranzacția curentă dacă există. */
export async function systemEvent(action: string, resourceType: string, note: Note = {}) {
  await appendAudit({
    id: randomUUID(), schemaVersion: 1, occurredAt: new Date().toISOString(), action, result: "ok", actorType: "system", actorId: null,
    actorRole: null, onBehalfOfHouseholdId: null, workspace: "system", sourceKind: "job", householdId: note.householdId ?? null,
    resourceType, resourceId: note.resourceId ?? null, correlationId: randomUUID(), requestId: null, ipHash: null, userAgent: null,
    reason: note.reason ?? null, changes: note.changes ? (redact(note.changes) as Record<string, unknown>) : null, unavailable: ["actor: sistem"],
  });
}
