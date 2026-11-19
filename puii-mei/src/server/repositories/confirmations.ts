import "server-only";
import { randomBytes } from "node:crypto";
import type { DeliveryConfirmation, Preorder } from "@/lib/domain";
import { CONFIRMATION_WINDOW_HOURS } from "@/lib/confirmation";
import { store } from "@/server/db/store";

const COLLECTION = "delivery-confirmations";

export const confirmationRepository = {
  async list() {
    const items = await store.list<DeliveryConfirmation>(COLLECTION);
    return items.sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));
  },
  async byPreorder(preorderId: string) {
    return (await store.list<DeliveryConfirmation>(COLLECTION)).find((c) => c.id === preorderId) ?? null;
  },
  async byToken(token: string) {
    if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
    return (await store.list<DeliveryConfirmation>(COLLECTION)).find((c) => c.token === token) ?? null;
  },
  /** Creează confirmarea la marcarea ca livrată (o singură dată pe precomandă). */
  async createFor(preorder: Preorder, farmSlug: string | null) {
    const existing = await this.byPreorder(preorder.id);
    if (existing) return { confirmation: existing, created: false };
    const now = new Date();
    const confirmation: DeliveryConfirmation = {
      id: preorder.id,
      token: randomBytes(24).toString("base64url"),
      preorderNumber: preorder.number,
      farmSlug,
      lotCode: preorder.lotCode,
      birdsOrdered: preorder.birds,
      deliveredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CONFIRMATION_WINDOW_HOURS * 3600_000).toISOString(),
      sentByEmail: false,
    };
    await store.append(COLLECTION, confirmation);
    return { confirmation, created: true };
  },
  async update(id: string, patch: Partial<DeliveryConfirmation>) {
    return store.update<DeliveryConfirmation>(COLLECTION, id, patch);
  },
};
