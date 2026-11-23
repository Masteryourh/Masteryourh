import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyLedger, GRACE_MS, reconcile, release, reserve, seatViolation, setCapacity, usedSeats, type PreorderSnapshot } from "./seats-core.ts";

const now = new Date("2026-11-23T12:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);
const lot = (cap = 40) => emptyLedger("MS-2026-01", cap, now);
const p = (id: string, birds: number, lotCode: string | null = null, status = "noua") => ({ id, birds, lotCode, status });

test("rezervarea respectă capacitatea", () => {
  let l = lot(40);
  for (const id of ["a", "b", "c", "d", "e"]) l = reserve(l, [], id, 8, now).ledger;
  assert.equal(usedSeats(l), 40);
  const r = reserve(l, [], "f", 8, now);
  assert.equal(r.ok, false);
  assert.equal(usedSeats(r.ledger), 40);
});

test("idempotentă: aceeași precomandă rezervată de două ori se numără o dată", () => {
  const a = reserve(lot(), [], "a", 8, now).ledger;
  const b = reserve(a, [], "a", 8, now);
  assert.equal(b.ok, true);
  assert.equal(usedSeats(b.ledger), 8);
});

test("eliberarea scoate locurile; eliberarea unei precomenzi necunoscute nu schimbă nimic", () => {
  const l = reserve(lot(), [], "a", 8, now).ledger;
  assert.equal(usedSeats(release(l, "a", now)!), 0);
  assert.equal(release(l, "x", now), null);
});

test("anularea sau mutarea pe alt lot din precomenzi eliberează locurile la reconciliere", () => {
  let l = reserve(lot(), [], "a", 8, now).ledger;
  l = reserve(l, [], "b", 8, now).ledger;
  const snap: PreorderSnapshot = [p("a", 8, "MS-2026-01", "anulata"), p("b", 8, "FM-2026-01", "alocata-lot")];
  assert.equal(usedSeats(reconcile(l, snap, now)), 0);
});

test("cădere între rezervare și scrierea precomenzii: locul e păstrat în perioada de grație, apoi eliberat", () => {
  const l = reserve(lot(), [], "a", 8, now).ledger; // rezervat, dar lotul nu a fost scris pe precomandă
  const snap = [p("a", 8)];
  assert.equal(usedSeats(reconcile(l, snap, later(GRACE_MS - 1000))), 8, "o cerere în curs nu pierde locul");
  assert.equal(usedSeats(reconcile(l, snap, later(GRACE_MS + 1000))), 0, "rezervarea rămasă se eliberează");
});

test("o rezervare făcută de altă cerere după imagine (precomandă necunoscută) nu e ștearsă în grație", () => {
  const l = reserve(lot(), [], "nou", 8, now).ledger;
  assert.equal(usedSeats(reconcile(l, [], later(1000))), 8);
});

test("date istorice: precomenzile cu lotul scris, lipsă din registru, sunt adoptate", () => {
  const snap = [p("v1", 30, "MS-2026-01", "alocata-lot"), p("v2", 20, "MS-2026-01", "confirmata")];
  const l = reconcile(lot(40), snap, now);
  assert.equal(usedSeats(l), 50);
  assert.deepEqual(seatViolation(l), { lot: "MS-2026-01", used: 50, capacity: 40 }, "depășirea istorică se raportează");
  assert.equal(reserve(l, snap, "nou", 1, now).ok, false, "nu se mai adaugă nimic peste");
});

test("adoptarea folosește numărul de pui din precomandă", () => {
  const l = reserve(lot(), [], "a", 8, now).ledger;
  assert.equal(usedSeats(reconcile(l, [p("a", 12, "MS-2026-01", "alocata-lot")], now)), 12);
});

test("capacitatea nu poate scădea sub locurile ocupate", () => {
  const l = reserve(lot(80), [], "a", 50, now).ledger;
  assert.equal(setCapacity(l, [], 40, now).ok, false);
  const ok = setCapacity(l, [], 60, now);
  assert.equal(ok.ok, true);
  assert.equal(ok.ledger.capacity, 60);
  assert.equal(seatViolation(ok.ledger), null);
});
