import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigest, DEFAULT_DIGEST, digestKey, localDate, planDigests, type DigestFarm } from "./farmer-digest.ts";
import type { TodayItem } from "./today.ts";

const item = (id: string, severity: TodayItem["severity"] = "atentie"): TodayItem => ({ id, kind: "jurnal", severity, title: `Sarcina ${id}`, detail: `Detalii ${id}`, href: "/cont/gospodar", action: "Fă" });
const farm = (slug: string, items: TodayItem[], extra: Partial<DigestFarm> = {}): DigestFarm => ({ slug, name: `Gospodăria ${slug}`, phone: "0722000000", email: `${slug}@test.ro`, items, ...extra });
const on = { ...DEFAULT_DIGEST, enabled: true };
const URL = "https://www.puiimei.ro";
// 28.11.2026, 06:30 UTC = 08:30 în România (UTC+2).
const morning = new Date("2026-11-28T06:30:00Z");

test("implicit e dezactivat: nu se trimite nimic", () => {
  const r = planDigests([farm("a", [item("1")])], morning, new Set(), DEFAULT_DIGEST, URL);
  assert.equal(r.messages.length, 0);
  assert.deepEqual(r.skips, [{ farmSlug: "a", reason: "dezactivat" }]);
});

test("ziua și ora sunt cele locale (România), nu UTC", () => {
  assert.equal(localDate(new Date("2026-11-27T22:30:00Z"), "Europe/Bucharest"), "2026-11-28");
  // 04:30 UTC = 06:30 în România: înainte de ora 7 ⇒ prea devreme.
  const early = planDigests([farm("a", [item("1")])], new Date("2026-11-28T04:30:00Z"), new Set(), on, URL);
  assert.deepEqual(early.skips.map((s) => s.reason), ["prea-devreme"]);
  assert.equal(planDigests([farm("a", [item("1")])], morning, new Set(), on, URL).messages.length, 1);
});

test("deduplicare: un singur mesaj pe gospodărie / zi / canal, la rulări repetate", () => {
  const first = planDigests([farm("a", [item("1")])], morning, new Set(), on, URL);
  const sent = new Set(first.messages.map((m) => m.key));
  assert.ok(sent.has(digestKey("a", "2026-11-28", "sms")));
  const again = planDigests([farm("a", [item("1"), item("2")])], new Date("2026-11-28T15:00:00Z"), sent, on, URL);
  assert.deepEqual(again.skips.map((s) => s.reason), ["deja-trimis"]);
  // Ziua următoare: cheie nouă.
  assert.equal(planDigests([farm("a", [item("1")])], new Date("2026-11-29T06:30:00Z"), sent, on, URL).messages.length, 1);
});

test("determinist: aceleași date ⇒ același rezultat, indiferent de ordinea gospodăriilor", () => {
  const farms = [farm("b", [item("1")]), farm("a", [item("2", "urgent")])];
  const x = planDigests(farms, morning, new Set(), on, URL);
  const y = planDigests([...farms].reverse(), morning, new Set(), on, URL);
  assert.deepEqual(x, y);
  assert.deepEqual(x.messages.map((m) => m.farmSlug), ["a", "b"]);
});

test("fără sarcini sau fără contact: nu se trimite", () => {
  const r = planDigests([farm("a", []), farm("b", [item("1")], { phone: undefined })], morning, new Set(), on, URL);
  assert.deepEqual(r.skips.map((s) => s.reason), ["nimic-de-facut", "fara-contact"]);
  const mail = planDigests([farm("b", [item("1")], { phone: undefined })], morning, new Set(), { ...on, channel: "email" }, URL);
  assert.equal(mail.messages[0].to, "b@test.ro");
});

test("SMS: fără diacritice, cel mult două segmente, cu legătura spre panou; „și încă N” peste 5", () => {
  const many = Array.from({ length: 9 }, (_, i) => item(String(i + 1), i === 0 ? "urgent" : "atentie"));
  const d = buildDigest({ farmName: "Gospodăria Hreniuc", items: many, link: `${URL}/cont/gospodar` });
  assert.ok(d.sms.length <= 306, `${d.sms.length}`);
  assert.equal(/[ăâîșțĂÂÎȘȚ„”]/.test(d.sms), false);
  assert.ok(d.sms.endsWith(`${URL}/cont/gospodar`));
  assert.match(d.sms, /si inca 4/);
  assert.match(d.subject, /9 lucruri de făcut azi \(1 urgente\)/);
  // HTML-ul e scăpat (titlurile vin din date).
  const x = buildDigest({ farmName: "<b>", items: [{ ...item("1"), title: '<script>"' }], link: URL });
  assert.equal(x.html.includes("<script>"), false);
});
