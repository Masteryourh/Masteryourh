import "server-only";
import { AwsClient } from "aws4fetch";
import { objectUrl, readObjectStorageConfig, type ObjectStorageConfig } from "./config";

/**
 * Stocarea externă a fișierelor (S3 compatibil, bucket privat). Fișierele nu au adrese publice: se servesc doar prin
 * rutele aplicației (/foto, /fisiere), după verificarea accesului.
 */
let cached: { config: ObjectStorageConfig; client: AwsClient } | null | undefined;

function storage() {
  if (cached === undefined) {
    const config = readObjectStorageConfig(process.env);
    cached = config
      ? { config, client: new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: "s3", region: config.region }) }
      : null;
  }
  return cached;
}

export const objectStorageEnabled = () => storage() !== null;

export async function putObject(key: string, body: Buffer, mime: string) {
  const s = storage();
  if (!s) throw new Error("Stocarea externă a fișierelor nu e configurată");
  const res = await s.client.fetch(objectUrl(s.config, key), {
    method: "PUT",
    body: new Uint8Array(body),
    headers: { "Content-Type": mime, "Content-Length": String(body.length) },
  });
  if (!res.ok) throw new Error(`Salvarea fișierului a eșuat (${res.status})`);
}

export async function getObject(key: string): Promise<Buffer | null> {
  const s = storage();
  if (!s) throw new Error("Stocarea externă a fișierelor nu e configurată");
  const res = await s.client.fetch(objectUrl(s.config, key), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Citirea fișierului a eșuat (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
