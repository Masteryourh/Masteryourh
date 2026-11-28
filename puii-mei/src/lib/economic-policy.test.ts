import { test } from "node:test";
import assert from "node:assert/strict";
import { CURRENT_POLICY, missingForSettlement, mortalityPhase, settleLot, simulateLot, type EconomicPolicy, type LotInput } from "./economic-policy.ts";

const lot: LotInput = { totalKg: 1000, pricePerKg: 30, approvedLotCosts: 18000, pendingLotCosts: 0, closed: true };

test("politica în vigoare are deciziile confirmate (26.11.2026) și NU inventează valorile deschise", () => {
  assert.equal(CURRENT_POLICY.settlementUnit, "lot");
  assert.equal(CURRENT_POLICY.revenueBasis, "kg-totale-lot");
  assert.equal(CURRENT_POLICY.eligibleCosts, "doar-lot");
  assert.equal(CURRENT_POLICY.mortalityWindowDays, 21);
  assert.equal(CURRENT_POLICY.feeFormula, null);
  assert.equal(CURRENT_POLICY.mortalityReserve, null);
  assert.equal(CURRENT_POLICY.postWindowLoss, null);
  assert.equal(CURRENT_POLICY.costApprover, null);
  for (const k of ["settlementUnit", "revenueBasis", "eligibleCosts", "mortalityWindowDays"] as const) assert.ok(CURRENT_POLICY.sources[k], `sursa pentru ${k}`);
});

test("fail closed: decontul final e blocat cât timp politica are câmpuri deschise", () => {
  const r = settleLot(lot);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(r.blockedBy, missingForSettlement(CURRENT_POLICY));
});

const decided: EconomicPolicy = {
  ...CURRENT_POLICY,
  version: "test",
  feeFormula: { kind: "procent-profit", percent: 10 },
  mortalityReserve: { kind: "procent-venit", percent: 0, beforeFee: true },
  postWindowLoss: "rezerva",
  costApprover: "manager-local",
};

test("decont pe o politică complet decisă: 10% din profitul lotului (exemplul din cap. 09)", () => {
  const r = settleLot({ ...lot, totalKg: 600, pricePerKg: 30, approvedLotCosts: 12000 }, decided);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.settlement.revenue, 18000);
    assert.equal(r.settlement.profit, 6000);
    assert.equal(r.settlement.fee, 600);
    assert.equal(r.settlement.householdNet, 5400);
    assert.equal(r.settlement.kind, "decont");
  }
});

test("lot pe pierdere: onorariul procentual e 0, nu negativ", () => {
  const r = settleLot({ ...lot, approvedLotCosts: 40000 }, decided);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.settlement.fee, 0);
});

test("decontul e blocat și pentru lot deschis, cheltuieli neaprobate sau valori invalide", () => {
  for (const [input, motiv] of [
    [{ ...lot, closed: false }, "lotul nu e închis"],
    [{ ...lot, pendingLotCosts: 500 }, "există cheltuieli ale lotului neaprobate"],
    [{ ...lot, totalKg: -1 }, "valoare invalidă: totalKg"],
    [{ ...lot, pricePerKg: Number.NaN }, "valoare invalidă: pricePerKg"],
  ] as const) {
    const r = settleLot(input, decided);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.blockedBy.includes(motiv), motiv);
  }
});

test("simulare: valorile deschise vin explicit de la cel care simulează; rezultatul e marcat „simulare”", () => {
  const procent = simulateLot(lot, { feeFormula: { kind: "procent-profit", percent: 10 }, reserve: { kind: "procent-venit", percent: 5, beforeFee: true } });
  assert.ok(procent.ok);
  if (procent.ok) {
    assert.equal(procent.settlement.kind, "simulare");
    assert.equal(procent.settlement.reserve, 1500); // 5% din 30.000
    assert.equal(procent.settlement.fee, 1050); // 10% × (30.000 − 18.000 − 1.500)
    assert.match(procent.settlement.policyVersion, /\+simulare$/);
  }
  const dupa = simulateLot(lot, { feeFormula: { kind: "procent-profit", percent: 10 }, reserve: { kind: "procent-venit", percent: 5, beforeFee: false } });
  assert.ok(dupa.ok && dupa.settlement.fee === 1200, "rezerva după onorariu nu scade baza");
  const tarif = simulateLot(lot, { feeFormula: { kind: "tarif-kg", leiPerKg: 0.5 }, reserve: { kind: "procent-venit", percent: 0, beforeFee: true } });
  assert.ok(tarif.ok && tarif.settlement.fee === 500);
  assert.equal(simulateLot(lot, { feeFormula: { kind: "procent-profit", percent: 150 }, reserve: { kind: "procent-venit", percent: 0, beforeFee: true } }).ok, false);
});

test("mortalitatea: în fereastră până la ziua 21 inclusiv, după aceea separat", () => {
  assert.equal(mortalityPhase("2026-12-01", "2026-12-01T08:00:00Z", 21), "fereastra");
  assert.equal(mortalityPhase("2026-12-01", "2026-12-22", 21), "fereastra"); // ziua 21
  assert.equal(mortalityPhase("2026-12-01", "2026-12-23", 21), "dupa-fereastra"); // ziua 22
});
