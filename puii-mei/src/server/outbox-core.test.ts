import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKOFF_MS, claim, claimable, failed, LEASE_MS, MAX_ATTEMPTS, newMessage, resetForRetry, retryable, skipped, succeeded, type OutboxMessage } from "./outbox-core.ts";

const now = new Date("2026-11-24T12:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);
const msg = () => newMessage("m1", "email", { to: "a@test.ro", subject: "Subiect", html: "<p>x</p>", text: "x" }, now);

test("un mesaj nou e preluabil imediat; preluarea îl blochează pe durata termenului", () => {
  const m = msg();
  assert.ok(claimable(m, now));
  const c = { ...m, ...claim(m, now) } as OutboxMessage;
  assert.equal(c.status, "sending");
  assert.equal(c.attempts, 1);
  assert.equal(claimable(c, at(LEASE_MS - 1)), false, "alt trimițător nu-l poate lua în același timp");
  assert.ok(claimable(c, at(LEASE_MS)), "trimițătorul a căzut: termenul expiră și mesajul se reia");
});

test("după trimitere: stare finală, conținutul (date personale) se șterge, nu se mai retrimite", () => {
  const m = { ...msg(), ...claim(msg(), now) } as OutboxMessage;
  const s = { ...m, ...succeeded(at(1000)) } as OutboxMessage;
  assert.equal(s.status, "sent");
  assert.equal(s.payload, null);
  assert.equal(s.summary, "email: Subiect");
  assert.equal(claimable(s, at(10 * LEASE_MS)), false);
});

test("eșecul reprogramează cu așteptare crescătoare; după MAX_ATTEMPTS devine „dead”", () => {
  let m = msg();
  const waits: number[] = [];
  let t = now;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    assert.ok(claimable(m, t), `încercarea ${i} e scadentă`);
    m = { ...m, ...claim(m, t) } as OutboxMessage;
    m = { ...m, ...failed(m, t, "503") } as OutboxMessage;
    if (m.status === "dead") break;
    waits.push(Date.parse(m.nextAttemptAt) - t.getTime());
    assert.equal(claimable(m, t), false, "nu se reia înainte de termen");
    t = new Date(m.nextAttemptAt);
  }
  assert.equal(m.status, "dead");
  assert.equal(m.attempts, MAX_ATTEMPTS);
  assert.deepEqual(waits, BACKOFF_MS);
  assert.equal(claimable(m, at(365 * 86400_000)), false);
});

test("canal neconfigurat: „skipped”, fără reîncercări, fără conținut", () => {
  const m = { ...msg(), ...claim(msg(), now) } as OutboxMessage;
  const s = { ...m, ...skipped(now, "e-mail neconfigurat") } as OutboxMessage;
  assert.equal(s.status, "skipped");
  assert.equal(s.payload, null);
  assert.equal(claimable(s, at(10 * 86400_000)), false);
});

test("retrimiterea manuală: doar „dead” cu conținut; reîncepe încercările și e preluabilă imediat", () => {
  const dead = { ...msg(), status: "dead", attempts: MAX_ATTEMPTS, lastError: "503" } as OutboxMessage;
  assert.ok(retryable(dead));
  assert.equal(retryable({ ...dead, payload: null }), false, "fără conținut (skipped / sent) nu se poate retrimite");
  assert.equal(retryable({ ...msg(), status: "pending" } as OutboxMessage), false);
  const r = { ...dead, ...resetForRetry(now) } as OutboxMessage;
  assert.equal(r.attempts, 0);
  assert.ok(claimable(r, now));
});

test("SMS: rezumatul nu conține textul (poate avea PIN sau date personale)", () => {
  assert.equal(newMessage("s", "sms", { to: "0722", text: "PIN 1234" }, now).summary, "sms");
});
