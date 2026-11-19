import "server-only";
import { randomBytes } from "node:crypto";
import type { ConfirmationPhoto, DeliveryConfirmation, Preorder } from "@/lib/domain";
import { store } from "@/server/db/store";

const COLLECTION = "delivery-confirmations";
const PHOTOS = "confirmation-photos";

export function newToken() {
  return randomBytes(24).toString("base64url");
}

const validToken = (t: string) => /^[A-Za-z0-9_-]{20,}$/.test(t);

export const confirmationRepository = {
  async list() {
    const items = await store.list<DeliveryConfirmation>(COLLECTION);
    return items.sort((a, b) => (b.deliveredAt ?? b.createdAt).localeCompare(a.deliveredAt ?? a.createdAt));
  },
  async byPreorder(preorderId: string) {
    return store.get<DeliveryConfirmation>(COLLECTION, preorderId);
  },
  async byToken(token: string) {
    if (!validToken(token)) return null;
    return (await store.list<DeliveryConfirmation>(COLLECTION)).find((c) => c.token === token) ?? null;
  },
  async byCourierToken(token: string) {
    if (!validToken(token)) return null;
    return (await store.list<DeliveryConfirmation>(COLLECTION)).find((c) => c.courierToken === token) ?? null;
  },
  async byRatingToken(token: string) {
    if (!validToken(token)) return null;
    return (await store.list<DeliveryConfirmation>(COLLECTION)).find((c) => c.ratingToken === token) ?? null;
  },
  /** Creează (o singură dată) înregistrarea cu cele două coduri pentru etichetă. */
  async ensureFor(preorder: Preorder, farmSlug: string | null) {
    const existing = await this.byPreorder(preorder.id);
    if (existing) return existing;
    const c: DeliveryConfirmation = {
      id: preorder.id,
      token: newToken(),
      courierToken: newToken(),
      preorderNumber: preorder.number,
      farmSlug,
      lotCode: preorder.lotCode,
      birdsOrdered: preorder.birds,
      createdAt: new Date().toISOString(),
      sentByEmail: false,
    };
    await store.append(COLLECTION, c);
    return c;
  },
  async update(id: string, patch: Partial<DeliveryConfirmation>) {
    return store.update<DeliveryConfirmation>(COLLECTION, id, patch);
  },
  async savePhoto(photo: ConfirmationPhoto) {
    return store.append(PHOTOS, photo);
  },
  async photo(id: string) {
    return store.get<ConfirmationPhoto>(PHOTOS, id);
  },
};
