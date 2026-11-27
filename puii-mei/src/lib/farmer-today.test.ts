import { test } from "node:test";
import assert from "node:assert/strict";
import { farmerToday, type FarmerDay } from "./farmer-today.ts";

const base: FarmerDay = { base: "/cont/gospodar", q: "", today: "2026-11-27", growthAlerts: [], growing: [], entries: [], expiring: [], pendingLots: [], advancesDue: 0, hasPayment: true, orders: 0, tours: [], readyParcels: 0 };

test("zi liniștită: lista e goală", () => {
  assert.deepEqual(farmerToday(base), []);
});

test("lotul în creștere fără notare azi cere jurnalul; cu notare azi, nu", () => {
  const d = { ...base, growing: [{ code: "MS-1", day: 12, days: 56 }] };
  assert.equal(farmerToday(d)[0].kind, "jurnal");
  assert.equal(farmerToday({ ...d, entries: [{ lotCode: "MS-1", date: "2026-11-27" }] }).length, 0);
  assert.equal(farmerToday({ ...d, entries: [{ lotCode: "MS-1", date: "2026-11-26" }] }).length, 1);
});

test("ordinea: urgent (alertă, tura de azi, document expirat) înaintea acțiunilor și informărilor", () => {
  const items = farmerToday({
    ...base,
    growthAlerts: [{ id: "mutare:MS-1:1", kind: "mutare", text: "Țarcul 1 nu a fost mutat." }],
    growing: [{ code: "MS-1", day: 25, days: 56 }],
    expiring: [{ id: "d1", title: "Autorizație", days: -2 }, { id: "d2", title: "Contract", days: 30 }],
    tours: [{ id: "t1", code: "T-1", date: "2026-11-27", status: "planificata", parcels: 3 }, { id: "t2", code: "T-2", date: "2026-11-28", status: "planificata", parcels: 1 }],
    readyParcels: 2,
    pendingLots: ["MS-2"],
    orders: 4,
    advancesDue: 2,
  });
  assert.deepEqual(items.map((i) => i.kind), ["crestere", "tura", "document", "jurnal", "avans", "colete", "lot"]);
  assert.ok(items.every((i) => i.href.startsWith("/cont/gospodar")));
});

test("fără cont bancar: cere contul, nu confirmarea avansurilor", () => {
  const items = farmerToday({ ...base, orders: 3, advancesDue: 3, hasPayment: false });
  assert.deepEqual(items.map((i) => i.kind), ["cont"]);
});

test("adminul în previzualizare rămâne pe gospodăria aleasă", () => {
  const items = farmerToday({ ...base, q: "?gospodarie=hreniuc", growing: [{ code: "MS-1", day: 3, days: 56 }], readyParcels: 1 });
  assert.equal(items[0].href, "/cont/gospodar/jurnal?gospodarie=hreniuc");
  assert.equal(items[1].href, "/cont/gospodar?gospodarie=hreniuc#ture");
});
