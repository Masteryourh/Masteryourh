import "server-only";
import { randomUUID } from "node:crypto";
import type { FarmPaymentDetails } from "@/lib/domain";
import { store } from "@/server/db/store";
import { activateIfDue, maskIban, type PaymentDoc } from "@/server/iban-core";

const COLLECTION = "farm-payments";
export const IBAN_AUDIT = "iban-audit";

export type IbanAuditEntry = {
  id: string;
  farmSlug: string;
  changeId: string;
  action: "cerere" | "inlocuita" | "notificare" | "notificare-esuata" | "confirmata" | "respinsa" | "anulata" | "activata" | "cont-blocat";
  actor: string;
  actorId?: string;
  at: string;
  iban: string;
  note?: string;
};

/** Jurnalul schimbărilor de IBAN: doar adăugare (nu se modifică, nu se șterge). IBAN-ul apare mascat. */
export async function auditIban(e: Omit<IbanAuditEntry, "id" | "at" | "iban"> & { iban: string }) {
  await store.append<IbanAuditEntry>(IBAN_AUDIT, { ...e, id: randomUUID(), at: new Date().toISOString(), iban: maskIban(e.iban) });
}

/** Datele de plată ale gospodăriilor (contul activ, prețul furajului, cererea de schimbare a contului). */
export const farmPaymentRepository = {
  /** Aplică (atomic) activarea unui cont nou confirmat al cărui termen a trecut. */
  async bySlug(slug: string): Promise<FarmPaymentDetails | null> {
    const doc = await store.get<FarmPaymentDetails>(COLLECTION, slug);
    const c = doc?.ibanChange;
    if (!doc || !c || c.status !== "confirmat" || Date.now() < Date.parse(c.activatesAfter)) return doc;
    const activated = await store.transact<FarmPaymentDetails, boolean>(COLLECTION, slug, (cur) => {
      if (!cur) return { result: false };
      const next = activateIfDue(cur as PaymentDoc, new Date());
      return next === cur ? { result: false } : { patch: next, result: true };
    });
    if (activated) await auditIban({ farmSlug: slug, changeId: c.id, action: "activata", actor: "sistem", iban: c.iban });
    return store.get<FarmPaymentDetails>(COLLECTION, slug);
  },
  async list(): Promise<FarmPaymentDetails[]> {
    return Promise.all((await store.list<FarmPaymentDetails>(COLLECTION)).map(async (d) => (await this.bySlug(d.id)) ?? d));
  },
};

export { normalizeIban } from "@/server/iban-core";
