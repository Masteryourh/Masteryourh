import "server-only";
import { store } from "@/server/db/store";
import { objectKey } from "./config";
import { sha256 } from "./content";
import { getObject, objectStorageEnabled, putObject } from "./object-storage";

/**
 * Mutarea fișierelor vechi din baza de date (base64) în stocarea externă, pe loturi. Pentru fiecare fișier:
 * încărcare → recitire și comparare a amprentei SHA-256 → abia apoi se scoate conținutul din baza de date.
 * Idempotentă: un fișier deja mutat nu se mai atinge; o întrerupere lasă fișierul în baza de date.
 */
type Rec = { id: string; mime: string; data?: string | null; blobKey?: string; sha256?: string; size?: number };
const KINDS = ["photos", "files"] as const;

export async function storageStatus() {
  const out = { enabled: objectStorageEnabled(), inDb: 0, inDbBytes: 0, external: 0 };
  for (const kind of KINDS) {
    for (const r of await store.list<Rec>(kind)) {
      if (r.data) {
        out.inDb++;
        out.inDbBytes += Math.floor((r.data.length * 3) / 4);
      } else if (r.blobKey) out.external++;
    }
  }
  return out;
}

export async function migrateBatch(limit = 25) {
  if (!objectStorageEnabled()) throw new Error("Stocarea externă a fișierelor nu e configurată.");
  let moved = 0;
  const errors: string[] = [];
  for (const kind of KINDS) {
    for (const r of await store.list<Rec>(kind)) {
      if (moved >= limit) break;
      if (!r.data || r.blobKey) continue;
      try {
        const buf = Buffer.from(r.data, "base64");
        const hash = sha256(buf);
        if (r.sha256 && r.sha256 !== hash) throw new Error("amprenta din baza de date nu corespunde conținutului");
        const key = objectKey(kind, r.id);
        await putObject(key, buf, r.mime);
        const back = await getObject(key);
        if (!back || sha256(back) !== hash) throw new Error("verificarea după încărcare a eșuat");
        await store.update<Rec>(kind, r.id, { blobKey: key, data: null, sha256: hash, size: buf.length });
        moved++;
      } catch (err) {
        errors.push(`${kind}/${r.id}: ${(err as Error).message}`);
      }
    }
  }
  return { moved, errors, ...(await storageStatus()) };
}
