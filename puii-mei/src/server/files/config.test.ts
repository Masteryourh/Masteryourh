import { test } from "node:test";
import assert from "node:assert/strict";
import { objectKey, objectUrl, readObjectStorageConfig } from "./config.ts";

const full = {
  FILES_S3_ENDPOINT: "https://abc.r2.cloudflarestorage.com/",
  FILES_S3_BUCKET: "puii-mei-fisiere",
  FILES_S3_ACCESS_KEY_ID: "id",
  FILES_S3_SECRET_ACCESS_KEY: "secret",
};

test("fără configurare completă → null (fișierele rămân în baza de date)", () => {
  assert.equal(readObjectStorageConfig({}), null);
  assert.equal(readObjectStorageConfig({ ...full, FILES_S3_SECRET_ACCESS_KEY: "" }), null);
});

test("configurare completă; regiunea implicită „auto”; fără / la final", () => {
  const c = readObjectStorageConfig(full)!;
  assert.equal(c.endpoint, "https://abc.r2.cloudflarestorage.com");
  assert.equal(c.region, "auto");
  assert.equal(objectUrl(c, "photos/0d4c8a1e-1b2c-4d5e-8f90-123456789abc"), "https://abc.r2.cloudflarestorage.com/puii-mei-fisiere/photos/0d4c8a1e-1b2c-4d5e-8f90-123456789abc");
});

test("HTTP necriptat refuzat, cu excepția localhost (teste)", () => {
  assert.equal(readObjectStorageConfig({ ...full, FILES_S3_ENDPOINT: "http://storage.example.com" }), null);
  assert.ok(readObjectStorageConfig({ ...full, FILES_S3_ENDPOINT: "http://127.0.0.1:9100" }));
});

test("nume de bucket invalid refuzat", () => {
  assert.equal(readObjectStorageConfig({ ...full, FILES_S3_BUCKET: "Bucket_Mare" }), null);
});

test("cheia obiectului acceptă doar UUID (fără drumuri de tip ../)", () => {
  assert.equal(objectKey("files", "0d4c8a1e-1b2c-4d5e-8f90-123456789abc"), "files/0d4c8a1e-1b2c-4d5e-8f90-123456789abc");
  assert.throws(() => objectKey("files", "../alt"));
});
