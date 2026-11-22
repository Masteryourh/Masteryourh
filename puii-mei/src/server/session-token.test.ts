import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeSession, keyedHash, MIN_SECRET_LENGTH, safeEqual, sessionSecret, signPayload, verifyPayload } from "./session-token.ts";

const STRONG = "x".repeat(MIN_SECRET_LENGTH);

test("producție fără SESSION_SECRET: eroare, fără cheie derivată din parola de admin", () => {
  assert.throws(() => sessionSecret({ NODE_ENV: "production", ADMIN_PASSWORD: "Parola12345" }), /SESSION_SECRET nu este setat/);
});

test("SESSION_SECRET prea scurt: eroare", () => {
  assert.throws(() => sessionSecret({ NODE_ENV: "production", SESSION_SECRET: "scurt" }), /prea scurt/);
});

test("SESSION_SECRET valid e folosit ca atare", () => {
  assert.equal(sessionSecret({ NODE_ENV: "production", SESSION_SECRET: STRONG }), STRONG);
});

test("dezvoltare locală fără SESSION_SECRET: cheie de dezvoltare, nu parola de admin", () => {
  const s = sessionSecret({ NODE_ENV: "development", ADMIN_PASSWORD: "Parola12345" });
  assert.ok(!s.includes("Parola12345"));
});

test("cheia nu depinde de ADMIN_PASSWORD", () => {
  const a = keyedHash("pin", "id:123456", { NODE_ENV: "production", SESSION_SECRET: STRONG, ADMIN_PASSWORD: "a" });
  const b = keyedHash("pin", "id:123456", { NODE_ENV: "production", SESSION_SECRET: STRONG, ADMIN_PASSWORD: "b" });
  assert.equal(a, b);
});

test("scopuri diferite dau amprente diferite", () => {
  const env = { NODE_ENV: "production", SESSION_SECRET: STRONG };
  assert.notEqual(keyedHash("pin", "x", env), keyedHash("altceva", "x", env));
});

test("semnătura: token valid acceptat, token modificat respins", () => {
  process.env.SESSION_SECRET = STRONG;
  const exp = Math.floor(Date.now() / 1000) + 60;
  const token = signPayload({ uid: "u1", role: "admin", v: 1, exp });
  assert.equal(decodeSession(token)?.uid, "u1");
  const [data, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ uid: "u2", role: "admin", v: 1, exp })).toString("base64url");
  assert.equal(decodeSession(`${forged}.${sig}`), null);
  assert.equal(verifyPayload(`${data}.x${sig}`), null);
});

test("semnătura cu altă cheie e respinsă", () => {
  process.env.SESSION_SECRET = STRONG;
  const token = signPayload({ uid: "u1", role: "admin", v: 1, exp: Math.floor(Date.now() / 1000) + 60 });
  process.env.SESSION_SECRET = "y".repeat(MIN_SECRET_LENGTH);
  assert.equal(decodeSession(token), null);
});

test("token expirat respins", () => {
  process.env.SESSION_SECRET = STRONG;
  assert.equal(decodeSession(signPayload({ uid: "u1", role: "admin", v: 1, exp: Math.floor(Date.now() / 1000) - 1 })), null);
});

test("safeEqual", () => {
  assert.equal(safeEqual("Parola12345", "Parola12345"), true);
  assert.equal(safeEqual("Parola12345", "Parola1234"), false);
  assert.equal(safeEqual("", "x"), false);
});

test("sessionSecretReady", async () => {
  const { sessionSecretReady } = await import("./session-token.ts");
  assert.equal(sessionSecretReady({ NODE_ENV: "production" }), false);
  assert.equal(sessionSecretReady({ NODE_ENV: "production", SESSION_SECRET: STRONG }), true);
});
