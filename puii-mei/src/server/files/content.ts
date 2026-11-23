import "server-only";
import { createHash } from "node:crypto";
import { objectKey } from "./config";
import { getObject, objectStorageEnabled, putObject } from "./object-storage";

/**
 * Conținutul fișierelor și fotografiilor: în stocarea externă când e configurată, altfel în baza de date (base64),
 * ca până acum. Înregistrarea din baza de date păstrează mereu metadatele și amprenta SHA-256.
 */
export const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

/** Întâi fișierul, apoi înregistrarea: o înregistrare nu indică niciodată un fișier care nu există. */
export async function storeContent(kind: "photos" | "files", id: string, buf: Buffer, mime: string) {
  if (!objectStorageEnabled()) return { data: buf.toString("base64") };
  const blobKey = objectKey(kind, id);
  await putObject(blobKey, buf, mime);
  return { blobKey, data: null };
}

/**
 * Citește conținutul. Dacă există amprenta, o verifică: un fișier modificat în stocare nu se servește.
 */
export async function readContent(rec: { data?: string | null; blobKey?: string; sha256?: string }): Promise<Buffer | null> {
  const buf = rec.data ? Buffer.from(rec.data, "base64") : rec.blobKey ? await getObject(rec.blobKey) : null;
  if (buf && rec.sha256 && sha256(buf) !== rec.sha256) {
    console.error("[puii-mei] Amprenta fișierului nu corespunde", rec.blobKey ?? "(baza de date)");
    return null;
  }
  return buf;
}
