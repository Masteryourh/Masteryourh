import { test } from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, hotp, newTotpSecret, otpauthUri, timeStep, verifyTotp } from "./totp.ts";

// RFC 4226, anexa D: cheia „12345678901234567890”
const RFC_KEY = Buffer.from("12345678901234567890");

test("HOTP: vectorii oficiali RFC 4226", () => {
  const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
  expected.forEach((code, counter) => assert.equal(hotp(RFC_KEY, counter), code));
});

test("TOTP: vectorii oficiali RFC 6238 (SHA-1, 8 cifre)", () => {
  for (const [t, code] of [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"]] as const) {
    assert.equal(hotp(RFC_KEY, timeStep(t * 1000), 8), code);
  }
});

test("base32: dus-întors și vectorul RFC 4648", () => {
  assert.equal(base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
  assert.deepEqual(base32Decode("MZXW6YTBOI"), Buffer.from("foobar"));
  const s = newTotpSecret();
  assert.equal(s.length, 32);
  assert.equal(base32Decode(s).length, 20);
});

test("verificare: codul curent și cel al pasului vecin; nu codul vechi sau unul greșit", () => {
  const secret = base32Encode(RFC_KEY);
  const now = 1111111111 * 1000;
  const step = timeStep(now);
  assert.equal(verifyTotp(secret, hotp(RFC_KEY, step), now), step);
  assert.equal(verifyTotp(secret, hotp(RFC_KEY, step - 1), now), step - 1, "ceas cu 30 s în urmă");
  assert.equal(verifyTotp(secret, hotp(RFC_KEY, step - 3), now), null, "cod expirat");
  assert.equal(verifyTotp(secret, "000000", now), null);
  assert.equal(verifyTotp(secret, "12345", now), null, "format greșit");
});

test("refolosirea aceluiași cod e refuzată", () => {
  const secret = base32Encode(RFC_KEY);
  const now = 1111111111 * 1000;
  const code = hotp(RFC_KEY, timeStep(now));
  const used = verifyTotp(secret, code, now)!;
  assert.equal(verifyTotp(secret, code, now, used), null);
});

test("adresa pentru aplicația de autentificare", () => {
  assert.match(otpauthUri("ABC", "ion@test.ro"), /^otpauth:\/\/totp\/Puii%20mei%3Aion%40test\.ro\?secret=ABC&issuer=Puii%20mei/);
});
