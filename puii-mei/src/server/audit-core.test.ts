import { test } from "node:test";
import assert from "node:assert/strict";
import { canonical, eventHash, redact, verifyChain } from "./audit-core.ts";

test("AUD-T14: datele sensibile nu ajung în audit", () => {
  const r = redact({
    pin: "123456", password: "x", mfaCode: "654321", token: "abc", sessionVersion: 3, holder: "Ion", lotCode: "MS-2026-01", pickupPin: "4821",
    note: "IBAN nou RO49AAAA1B31007593840000 pentru plăți", nested: { personalPinHash: "scrypt$..", farmSlug: "g" },
  }) as Record<string, unknown>;
  assert.equal(r.pin, "[redactat]");
  assert.equal(r.password, "[redactat]");
  assert.equal(r.mfaCode, "[redactat]");
  assert.equal(r.token, "[redactat]");
  assert.equal(r.holder, "Ion");
  assert.equal(r.lotCode, "MS-2026-01", "codul lotului nu e sensibil");
  assert.equal(r.pickupPin, "[redactat]");
  assert.equal(r.note, "IBAN nou RO49••••0000 pentru plăți");
  assert.deepEqual(r.nested, { personalPinHash: "[redactat]", farmSlug: "g" });
  assert.ok(!JSON.stringify(r).includes("RO49AAAA1B31007593840000"));
});

test("JSON canonic: aceeași amprentă indiferent de ordinea cheilor", () => {
  assert.equal(canonical({ b: 1, a: { d: 2, c: [3] } }), '{"a":{"c":[3],"d":2},"b":1}');
  assert.equal(eventHash(null, { a: 1, b: 2 }), eventHash(null, { b: 2, a: 1 }));
});

test("AUD-T16: lanțul de amprente detectează modificarea sau inserarea unui eveniment", () => {
  const raw = [{ action: "a" }, { action: "b" }, { action: "c" }];
  let prev: string | null = null;
  const chain = raw.map((e, i) => {
    const h = eventHash(prev, e);
    const x = { ...e, seq: i + 1, prevHash: prev, eventHash: h };
    prev = h;
    return x;
  });
  const strip = ({ seq: _s, prevHash: _p, eventHash: _h, ...rest }: (typeof chain)[number]) => { void _s; void _p; void _h; return rest; };
  assert.equal(verifyChain(chain, strip), null);
  const tampered = chain.map((e) => (e.seq === 2 ? { ...e, action: "modificat" } : e));
  assert.equal(verifyChain(tampered, strip), 2);
  const removed = chain.filter((e) => e.seq !== 2);
  assert.equal(verifyChain(removed, strip), 3);
});
