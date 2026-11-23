import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activateIfDue, cancelChange, confirmByPhone, IBAN_DELAY_MS, maskIban, normalizeIban, payableAccount, rejectChange, requestChange, type PaymentDoc,
} from "./iban-core.ts";

const now = new Date("2026-11-23T12:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);
const OLD = { holder: "Ion Hreniuc", iban: "RO49AAAA1B31007593840000", bank: "BT" };
const NEW = { holder: "Ion Hreniuc", iban: "RO09BCYP0000001234567890", bank: "BCR" };
const farmer = { id: "u-gospodar", name: "Ion" };
const operator = { id: "u-admin", name: "Operator" };
const phones = ["0722 000 111"];
const doc = (active = OLD): PaymentDoc => ({ id: "gospodaria-hreniuc", ...active, feedPricePerKg: 2, updatedAt: now.toISOString(), updatedBy: "x" });
const requested = (d = doc()) => requestChange(d, NEW, farmer, phones, now, "c1");

test("cererea nu schimbă contul activ: clienții văd tot contul vechi", () => {
  const r = requested();
  assert.equal(r.change?.status, "in-verificare");
  assert.deepEqual(payableAccount(r.doc), OLD);
});

test("contul nou devine activ doar după confirmarea telefonică ȘI după 24 h", () => {
  const r = requested();
  assert.deepEqual(payableAccount(activateIfDue(r.doc, at(IBAN_DELAY_MS + 1))), OLD, "fără apel nu se activează nici după 24 h");
  const c = confirmByPhone(r.doc, "c1", operator, "+40 722 000 111", at(60_000));
  assert.ok(c.ok);
  assert.deepEqual(payableAccount(c.doc), OLD, "activare prematură refuzată");
  const later = activateIfDue(c.doc, at(IBAN_DELAY_MS));
  assert.deepEqual(payableAccount(later), NEW);
  assert.equal(later.ibanChange?.status, "activ");
  assert.deepEqual(activateIfDue(later, at(2 * IBAN_DELAY_MS)), later, "idempotent");
});

test("primul cont al gospodăriei: fără așteptare, dar tot cu confirmare telefonică", () => {
  const first = requestChange(doc({ holder: "", iban: "", bank: "" }), NEW, farmer, phones, now, "c1");
  assert.equal(payableAccount(first.doc), null, "neverificat → nimic de plătit (fail-closed)");
  const c = confirmByPhone(first.doc, "c1", operator, "0722000111", at(1000));
  assert.ok(c.ok);
  assert.deepEqual(payableAccount(c.doc), NEW);
});

test("aceeași persoană nu poate cere și confirma", () => {
  const c = confirmByPhone(requested().doc, "c1", farmer, "0722000111", now);
  assert.equal(c.ok, false);
});

test("apelul doar la un număr cunoscut dinainte de cerere", () => {
  const c = confirmByPhone(requested().doc, "c1", operator, "0799 999 999", now);
  assert.equal(c.ok, false);
});

test("replay / dublă confirmare: cerere veche sau deja tratată → refuz", () => {
  const r = requested();
  assert.equal(confirmByPhone(r.doc, "c0", operator, "0722000111", now).ok, false, "id vechi");
  const c = confirmByPhone(r.doc, "c1", operator, "0722000111", now);
  assert.ok(c.ok);
  assert.equal(confirmByPhone(c.doc, "c1", operator, "0722000111", now).ok, false, "a doua confirmare");
});

test("cerere repetată identică e idempotentă; o cerere diferită o înlocuiește și reîncepe verificarea", () => {
  const r = requested();
  const again = requestChange(r.doc, NEW, farmer, phones, at(5000), "c2");
  assert.equal(again.change?.id, "c1");
  const other = requestChange(r.doc, { ...NEW, iban: "RO66BACX0000001234567890" }, farmer, phones, at(5000), "c3");
  assert.equal(other.change?.id, "c3");
  assert.equal(other.replaced?.id, "c1");
  assert.equal(confirmByPhone(other.doc, "c1", operator, "0722000111", now).ok, false, "cererea înlocuită nu se mai confirmă");
});

test("„Nu am cerut eu” anulează cererea; după anulare nu se mai poate confirma", () => {
  const r = requested();
  const x = cancelChange(r.doc, "c1", farmer, at(1000));
  assert.ok(x.ok);
  assert.equal(x.change.status, "anulat");
  assert.equal(confirmByPhone(x.doc, "c1", operator, "0722000111", at(2000)).ok, false);
  assert.deepEqual(payableAccount(activateIfDue(x.doc, at(2 * IBAN_DELAY_MS))), OLD);
});

test("respingerea cere motiv și închide cererea; contul vechi rămâne", () => {
  const r = requested();
  assert.equal(rejectChange(r.doc, "c1", operator, "", now).ok, false);
  const x = rejectChange(r.doc, "c1", operator, "Titularul nu a confirmat", now);
  assert.ok(x.ok);
  assert.deepEqual(payableAccount(x.doc), OLD);
});

test("revenirea la contul activ anulează cererea în curs", () => {
  const r = requested();
  const back = requestChange(r.doc, OLD, farmer, phones, at(1000), "c9");
  assert.equal(back.change, null);
  assert.equal(back.replaced?.id, "c1");
  assert.equal(back.doc.ibanChange?.status, "anulat");
});

test("IBAN-ul mascat nu dezvăluie contul întreg", () => {
  assert.equal(maskIban(NEW.iban), "RO09 •••• 7890");
});

test("IBAN: format + cifra de control (mod 97)", () => {
  assert.equal(normalizeIban("ro49 aaaa 1b31 0075 9384 0000"), "RO49AAAA1B31007593840000");
  assert.equal(normalizeIban("RO48AAAA1B31007593840000"), null, "cifră de control greșită");
  assert.equal(normalizeIban("RO49AAAA1B3100759384"), null, "prea scurt");
  assert.equal(normalizeIban("DE89370400440532013000"), null, "nu e IBAN românesc");
});
