/**
 * Outbox (C2, review #62): mesajele externe (e-mail, SMS) se scriu în baza de date în ACEEAȘI tranzacție cu
 * modificarea și se trimit abia după commit. Funcții pure, testate unitar (outbox-core.test.ts).
 *
 * Stări: pending → sending (preluat, cu termen) → sent | pending (reîncercare cu așteptare) → dead (după MAX_ATTEMPTS);
 * skipped = canalul (e-mail / SMS) nu e configurat: nu se reîncearcă, conținutul se șterge, rămâne evidența.
 */
export type OutboxKind = "email" | "sms";
export type EmailPayload = { to: string; subject: string; html: string; text: string };
export type SmsPayload = { to: string; text: string };
export type OutboxStatus = "pending" | "sending" | "sent" | "dead" | "skipped";

export type OutboxMessage = {
  id: string;
  kind: OutboxKind;
  /** Conținutul; se șterge după trimitere (minimizarea datelor personale), rămâne doar `summary`. */
  payload: EmailPayload | SmsPayload | null;
  summary: string;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: string;
  leaseUntil?: string;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
};

export const MAX_ATTEMPTS = 6;
/** Așteptarea după încercarea n (1-based): 1 min, 5 min, 30 min, 2 h, 12 h. */
export const BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
export const LEASE_MS = 120_000;

export function newMessage(id: string, kind: OutboxKind, payload: EmailPayload | SmsPayload, now: Date): OutboxMessage {
  const summary = kind === "email" ? `email: ${(payload as EmailPayload).subject}`.slice(0, 160) : "sms";
  return { id, kind, payload, summary, status: "pending", attempts: 0, nextAttemptAt: now.toISOString(), createdAt: now.toISOString() };
}

/** Poate fi preluat acum? (în așteptare și scadent, sau „sending” cu termenul expirat — trimițătorul a căzut). */
export function claimable(m: OutboxMessage | null, now: Date): m is OutboxMessage {
  if (!m || !m.payload) return false;
  if (m.status === "pending") return Date.parse(m.nextAttemptAt) <= now.getTime();
  if (m.status === "sending") return !m.leaseUntil || Date.parse(m.leaseUntil) <= now.getTime();
  return false;
}

export function claim(m: OutboxMessage, now: Date): Partial<OutboxMessage> {
  return { status: "sending", attempts: m.attempts + 1, leaseUntil: new Date(now.getTime() + LEASE_MS).toISOString() };
}

export function succeeded(now: Date): Partial<OutboxMessage> {
  return { status: "sent", sentAt: now.toISOString(), payload: null, leaseUntil: undefined, lastError: undefined };
}

export function skipped(now: Date, reason: string): Partial<OutboxMessage> {
  return { status: "skipped", sentAt: now.toISOString(), payload: null, leaseUntil: undefined, lastError: reason.slice(0, 300) };
}

/** Doar mesajele „dead” care au încă conținutul pot fi retrimise manual (din Admin). */
export const retryable = (m: OutboxMessage | null): m is OutboxMessage => Boolean(m && m.status === "dead" && m.payload);

/** Retrimitere manuală: reîncepe numărătoarea încercărilor; eroarea anterioară rămâne vizibilă până la noul rezultat. */
export function resetForRetry(now: Date): Partial<OutboxMessage> {
  return { status: "pending", attempts: 0, nextAttemptAt: now.toISOString(), leaseUntil: undefined };
}

export function failed(m: OutboxMessage, now: Date, error: string): Partial<OutboxMessage> {
  if (m.attempts >= MAX_ATTEMPTS) return { status: "dead", leaseUntil: undefined, lastError: error.slice(0, 300) };
  const wait = BACKOFF_MS[Math.min(m.attempts, BACKOFF_MS.length) - 1] ?? BACKOFF_MS[0];
  return { status: "pending", nextAttemptAt: new Date(now.getTime() + wait).toISOString(), leaseUntil: undefined, lastError: error.slice(0, 300) };
}
