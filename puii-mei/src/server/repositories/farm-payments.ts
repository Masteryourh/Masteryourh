import "server-only";
import type { FarmPaymentDetails } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "farm-payments";

/** Datele de plată ale gospodăriilor (IBAN, titular, prețul furajului). */
export const farmPaymentRepository = {
  async bySlug(slug: string): Promise<FarmPaymentDetails | null> {
    return store.get<FarmPaymentDetails>(COLLECTION, slug);
  },
  async save(details: FarmPaymentDetails): Promise<FarmPaymentDetails> {
    const existing = await store.get<FarmPaymentDetails>(COLLECTION, details.id);
    if (existing) return (await store.update<FarmPaymentDetails>(COLLECTION, details.id, details)) ?? details;
    return store.append(COLLECTION, details);
  },
};

/** IBAN fără spații, cu majuscule; `null` dacă nu are formatul unui IBAN românesc. */
export function normalizeIban(raw: string): string | null {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  return /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(iban) ? iban : null;
}
