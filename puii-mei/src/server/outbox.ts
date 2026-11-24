import "server-only";
import { randomUUID } from "node:crypto";
import { store } from "./db/store";
import { claim, claimable, failed, newMessage, skipped, succeeded, type EmailPayload, type OutboxKind, type OutboxMessage, type SmsPayload } from "./outbox-core";

/**
 * Outbox (C2): mesajul se scrie în colecția `outbox` în aceeași tranzacție cu modificarea (dacă tranzacția se anulează,
 * mesajul dispare odată cu ea) și se trimite după commit. Ce nu reușește se reia cu așteptare (vezi outbox-core.ts):
 * la următoarea trimitere din aplicație și la jobul zilnic. Livrarea efectivă e injectată de email.ts / sms.ts.
 */
const COLLECTION = "outbox";
type DeliverResult = { ok: boolean; error?: string; skipped?: boolean };

async function deliver(kind: OutboxKind, payload: EmailPayload | SmsPayload, id: string): Promise<DeliverResult> {
  if (kind === "email") {
    const { deliverEmail, emailEnabled } = await import("./email");
    if (!emailEnabled()) return { ok: false, skipped: true, error: "e-mail neconfigurat (RESEND_API_KEY / EMAIL_FROM)" };
    return deliverEmail(payload as EmailPayload, id);
  }
  const { deliverSms, smsEnabled } = await import("./sms");
  if (!smsEnabled()) return { ok: false, skipped: true, error: "SMS neconfigurat (TWILIO_*)" };
  return deliverSms(payload as SmsPayload);
}

/** Pune mesajul în coadă (în tranzacția curentă, dacă există) și programează trimiterea după commit. */
export async function enqueue(kind: OutboxKind, payload: EmailPayload | SmsPayload) {
  const m = newMessage(randomUUID(), kind, payload, new Date());
  await store.append(COLLECTION, m);
  await store.afterCommit(async () => {
    await drain([m.id]);
  });
  return true;
}

async function sendOne(id: string) {
  const now = new Date();
  const m = await store.transact<OutboxMessage, OutboxMessage | null>(COLLECTION, id, (cur) =>
    claimable(cur, now) ? { patch: claim(cur, now), result: { ...cur, ...claim(cur, now) } as OutboxMessage } : { result: null },
  );
  if (!m || !m.payload) return "skip";
  let res: DeliverResult;
  try {
    res = await deliver(m.kind, m.payload, m.id);
  } catch (err) {
    res = { ok: false, error: err instanceof Error ? err.message : "eroare" };
  }
  const done = new Date();
  await store.transact<OutboxMessage, void>(COLLECTION, id, (cur) => ({
    // Doar dacă e tot preluarea noastră (alt trimițător n-a reluat-o după expirarea termenului).
    patch:
      cur && cur.status === "sending" && cur.attempts === m.attempts
        ? res.ok
          ? succeeded(done)
          : res.skipped
            ? skipped(done, res.error ?? "canal neconfigurat")
            : failed(cur, done, res.error ?? "eșec")
        : undefined,
    result: undefined,
  }));
  return res.ok ? "sent" : res.skipped ? "skipped" : "failed";
}

/**
 * Trimite mesajele date și, oportunist, câteva mesaje restante scadente. Întoarce numărul pe stări.
 * `all` (jobul zilnic): toate mesajele restante.
 */
export async function drain(ids: string[] = [], { all = false, extra = 5 } = {}) {
  const pendingIds = new Set(ids);
  const due = (await store.findBy<OutboxMessage>(COLLECTION, "status", ["pending", "sending"])).filter((m) => claimable(m, new Date()));
  for (const m of all ? due : due.slice(0, extra)) pendingIds.add(m.id);
  const out: Record<string, number> = {};
  for (const id of pendingIds) {
    const r = await sendOne(id);
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}
