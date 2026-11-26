import { test } from "node:test";
import assert from "node:assert/strict";
import { dbRegion, writeCeiling } from "./db-region.ts";

test("regiunea se citește doar din numele serverului Neon; fără server Neon → null", () => {
  assert.deepEqual(dbRegion("postgresql://u:p@ep-cool-1234-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"), {
    region: "eu-central-1", provider: "Neon (AWS)", vercel: "fra1", city: "Frankfurt",
  });
  assert.equal(dbRegion("postgresql://u:p@ep-x.us-east-1.aws.neon.tech/db")?.vercel, "iad1");
  assert.equal(dbRegion("postgresql://postgres@localhost:5433/puii"), null);
  assert.equal(dbRegion("nu e url"), null);
});

test("plafonul de scrieri: măsurat până la 10 ms, estimat (și marcat) peste", () => {
  assert.deepEqual(writeCeiling(0.4), { perSecond: 800, measured: true, row: "0 ms" });
  assert.deepEqual(writeCeiling(9), { perSecond: 30, measured: true, row: "10 ms" });
  const far = writeCeiling(93.4);
  assert.equal(far.measured, false);
  assert.equal(far.perSecond, 3);
});
