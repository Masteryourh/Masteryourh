/**
 * Configurarea stocării externe a fișierelor (S3 compatibil: Cloudflare R2, Backblaze B2, AWS S3…). Funcții pure,
 * testate unitar. Fără configurare completă, fișierele rămân în baza de date (comportamentul de până acum).
 */
export type ObjectStorageConfig = { endpoint: string; bucket: string; region: string; accessKeyId: string; secretAccessKey: string };

export function readObjectStorageConfig(env: Record<string, string | undefined>): ObjectStorageConfig | null {
  const endpoint = env.FILES_S3_ENDPOINT?.trim().replace(/\/+$/, "");
  const bucket = env.FILES_S3_BUCKET?.trim();
  const accessKeyId = env.FILES_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.FILES_S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  if (!/^https?:\/\//.test(endpoint)) return null;
  // HTTP necriptat doar către localhost (testele); în rest, numai HTTPS.
  if (endpoint.startsWith("http://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(endpoint)) return null;
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) return null;
  return { endpoint, bucket, region: env.FILES_S3_REGION?.trim() || "auto", accessKeyId, secretAccessKey };
}

/** Cheia obiectului: tipul + id-ul (UUID), fără date din fișier (numele original rămâne doar în baza de date). */
export function objectKey(kind: "photos" | "files", id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Id de fișier invalid");
  return `${kind}/${id}`;
}

/** Adresa obiectului (stil „path”, merge la toți furnizorii S3 compatibili). */
export const objectUrl = (c: ObjectStorageConfig, key: string) => `${c.endpoint}/${encodeURIComponent(c.bucket)}/${key}`;
