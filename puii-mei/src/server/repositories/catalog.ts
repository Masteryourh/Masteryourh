import type { DeliveryZone, Farm, Lot } from "@/lib/domain";
import { farms } from "@/data/farms";
import { lots } from "@/data/lots";
import { deliveryZones } from "@/data/zones";
import { isOpenForPreorder, normalizeLotCode } from "@/lib/lots";

/**
 * Catalogul (gospodării, loturi, zone). În prima versiune citește date
 * statice; semnăturile asincrone permit trecerea la o bază de date fără
 * modificarea paginilor.
 */
export const farmRepository = {
  async list(): Promise<Farm[]> {
    return farms;
  },
  async bySlug(slug: string): Promise<Farm | null> {
    return farms.find((f) => f.slug === slug) ?? null;
  },
};

export const lotRepository = {
  async list(): Promise<Lot[]> {
    return [...lots].sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
  async byCode(code: string): Promise<Lot | null> {
    const c = normalizeLotCode(code);
    return lots.find((l) => l.code === c) ?? null;
  },
  async byFarm(slug: string): Promise<Lot[]> {
    return lots
      .filter((l) => l.farmSlug === slug)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
  async openForPreorder(now = new Date()): Promise<Lot[]> {
    return lots
      .filter((l) => isOpenForPreorder(l, now))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
};

export const zoneRepository = {
  async listActive(): Promise<DeliveryZone[]> {
    return deliveryZones.filter((z) => z.active);
  },
  async byId(id: string): Promise<DeliveryZone | null> {
    return deliveryZones.find((z) => z.id === id && z.active) ?? null;
  },
};
