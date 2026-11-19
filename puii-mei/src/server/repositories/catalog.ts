import type { DeliveryZone, Farm, FarmRecord, Lot } from "@/lib/domain";
import { farms as demoFarms } from "@/data/farms";
import { lots } from "@/data/lots";
import { deliveryZones } from "@/data/zones";
import { isOpenForPreorder, normalizeLotCode } from "@/lib/lots";
import { slugify } from "@/lib/slug";
import { store } from "@/server/db/store";

/**
 * Catalogul (gospodării, loturi, zone).
 *
 * Gospodăriile vin din două surse:
 * - „demo”: definite în src/data/farms.ts (pot fi doar ascunse din admin);
 * - „admin”: create din panoul de administrare, salvate în baza de date.
 */
const FARMS = "farms";
const OVERRIDES = "farm-overrides";

type StoredFarm = Omit<FarmRecord, "source">;
interface FarmOverride {
  id: string;
  active: boolean;
}

async function allFarms(): Promise<FarmRecord[]> {
  const [stored, overrides] = await Promise.all([
    store.list<StoredFarm>(FARMS),
    store.list<FarmOverride>(OVERRIDES),
  ]);
  const hidden = new Map(overrides.map((o) => [o.id, o.active]));
  return [
    ...demoFarms.map((f) => ({ ...f, id: f.slug, active: hidden.get(f.slug) ?? true, source: "demo" as const })),
    ...stored.map((f) => ({ ...f, source: "admin" as const })),
  ];
}

export const farmRepository = {
  /** Gospodăriile active, afișate public. */
  async list(): Promise<FarmRecord[]> {
    return (await allFarms()).filter((f) => f.active);
  },
  /** Toate gospodăriile, inclusiv cele ascunse (pentru admin). */
  async listAll(): Promise<FarmRecord[]> {
    return allFarms();
  },
  async bySlug(slug: string, { includeInactive = false } = {}): Promise<FarmRecord | null> {
    const farm = (await allFarms()).find((f) => f.slug === slug) ?? null;
    return farm && (farm.active || includeInactive) ? farm : null;
  },
  async create(data: Omit<Farm, "slug" | "photos" | "since"> & { applicationId?: string }): Promise<FarmRecord> {
    const existing = new Set((await allFarms()).map((f) => f.slug));
    const base = slugify(data.name) || "gospodarie";
    let slug = base;
    for (let i = 2; existing.has(slug); i++) slug = `${base}-${i}`;
    const farm: StoredFarm = {
      ...data,
      slug,
      id: slug,
      active: true,
      since: new Date().getFullYear(),
      createdAt: new Date().toISOString(),
      photos: [1, 2, 3].map((n) => ({
        src: `/images/gospodarii/${slug}-${n}.jpg`,
        alt: `Fotografie ${n} – ${data.name}`,
      })),
    };
    await store.append(FARMS, farm);
    return { ...farm, source: "admin" };
  },
  async update(slug: string, patch: Partial<Omit<Farm, "slug">>) {
    return store.update<StoredFarm>(FARMS, slug, patch);
  },
  async setActive(farm: FarmRecord, active: boolean) {
    if (farm.source === "admin") return store.update<StoredFarm>(FARMS, farm.id, { active });
    const overrides = await store.list<FarmOverride>(OVERRIDES);
    if (overrides.some((o) => o.id === farm.slug)) return store.update<FarmOverride>(OVERRIDES, farm.slug, { active });
    return store.append<FarmOverride>(OVERRIDES, { id: farm.slug, active });
  },
};

async function activeFarmSlugs() {
  return new Set((await farmRepository.list()).map((f) => f.slug));
}

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
  /** Loturi deschise pentru precomenzi – doar din gospodăriile active. */
  async openForPreorder(now = new Date()): Promise<Lot[]> {
    const active = await activeFarmSlugs();
    return lots
      .filter((l) => active.has(l.farmSlug) && isOpenForPreorder(l, now))
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
