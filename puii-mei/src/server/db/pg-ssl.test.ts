import { test } from "node:test";
import assert from "node:assert/strict";
import { pgSslConfig } from "./pg-ssl.ts";

test("baza la distanță: certificatul se verifică", () => {
  assert.deepEqual(pgSslConfig("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require", {}), { rejectUnauthorized: true });
});

test("niciodată rejectUnauthorized: false", () => {
  for (const url of ["postgresql://u:p@db.example.com/db", "postgres://u:p@10.0.0.5:5432/db"]) {
    assert.equal(pgSslConfig(url, {})?.rejectUnauthorized, true);
  }
});

test("CA propriu din DATABASE_CA_CERT", () => {
  const ca = "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----";
  assert.deepEqual(pgSslConfig("postgresql://u:p@db.example.com/db", { DATABASE_CA_CERT: ca }), { rejectUnauthorized: true, ca });
});

test("baza locală: fără TLS", () => {
  assert.equal(pgSslConfig("postgresql://postgres@localhost:5433/puii", {}), undefined);
  assert.equal(pgSslConfig("postgresql://postgres@127.0.0.1/puii", {}), undefined);
});
