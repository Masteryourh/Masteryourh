import { test } from "node:test";
import assert from "node:assert/strict";
import { currentThreshold, daysUntil, dueReminders, expiringDocuments, isReplaced, reminderText, type ExpiringDoc } from "./document-expiry.ts";

const now = new Date("2026-11-24T10:00:00Z");
const doc = (id: string, expiresOn: string | undefined, uploadedAt = "2026-01-01T00:00:00Z", category = "dsv"): ExpiringDoc => ({
  id, farmSlug: "f", category, title: `Doc ${id}`, expiresOn, uploadedAt,
});

test("zile până la expirare, după calendarul din România", () => {
  assert.equal(daysUntil("2026-11-24", now), 0);
  assert.equal(daysUntil("2026-12-24", now), 30);
  assert.equal(daysUntil("2026-11-20", now), -4);
  // 23:30 ora României pe 24 noiembrie e încă 24 noiembrie
  assert.equal(daysUntil("2026-11-25", new Date("2026-11-24T21:30:00Z")), 1);
});

test("pragul curent: cel mai mic prag atins", () => {
  assert.equal(currentThreshold(61), null);
  assert.equal(currentThreshold(60), 60);
  assert.equal(currentThreshold(45), 60);
  assert.equal(currentThreshold(30), 30);
  assert.equal(currentThreshold(8), 14);
  assert.equal(currentThreshold(7), 7);
  assert.equal(currentThreshold(1), 7);
  assert.equal(currentThreshold(0), 0);
  assert.equal(currentThreshold(-10), 0);
});

test("o alertă pe prag, cu cheie stabilă; fără alertă peste 60 de zile sau fără dată de expirare", () => {
  const r = dueReminders([doc("a", "2026-12-24"), doc("b", "2027-06-01"), doc("c", undefined)], now);
  assert.equal(r.length, 1);
  assert.equal(r[0].key, "a:2026-12-24:30");
  assert.deepEqual(dueReminders([doc("a", "2026-12-24")], new Date("2026-11-25T10:00:00Z"))[0].key, "a:2026-12-24:30", "a doua zi: aceeași cheie → nu se retrimite");
});

test("documentul înlocuit de unul nou de același tip nu mai primește alerte", () => {
  const old = doc("vechi", "2026-12-01", "2025-12-01T00:00:00Z");
  const fresh = doc("nou", "2027-12-01", "2026-11-20T00:00:00Z");
  assert.equal(isReplaced(old, [old, fresh]), true);
  assert.deepEqual(dueReminders([old, fresh], now), []);
  const otherType = doc("altul", "2027-12-01", "2026-11-20T00:00:00Z", "contract");
  assert.equal(isReplaced(old, [old, otherType]), false, "alt tip de document nu înlocuiește");
});

test("lista „expiră în curând”: cele mai urgente primele, inclusiv cele expirate", () => {
  const list = expiringDocuments([doc("a", "2027-01-10"), doc("b", "2026-11-20"), doc("c", "2026-12-01")], now);
  assert.deepEqual(list.map((x) => [x.doc.id, x.days]), [["b", -4], ["c", 7], ["a", 47]]);
});

test("textele alertelor", () => {
  assert.match(reminderText("Înregistrare DSV", 30), /expiră în 30 de zile/);
  assert.match(reminderText("Înregistrare DSV", 7), /expiră în 7 zile/);
  assert.match(reminderText("Înregistrare DSV", 0), /expiră azi/);
  assert.match(reminderText("Înregistrare DSV", -1), /a expirat de o zi/);
});
