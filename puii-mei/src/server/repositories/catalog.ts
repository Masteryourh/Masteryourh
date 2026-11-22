import type { DeliveryZone, Farm, FarmRecord, Lot } from "@/lib/domain";
import { farms as demoFarms } from "@/data/farms";
import { lots } from "@/data/lots";
import { deliveryZones } from "@/data/zones";
import { isApproved, isOpenForPreorder, lotCodeFor, normalizeLotCode } from "@/lib/lots";
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

const LOTS = "lots";
type StoredLot = Lot & { id: string };

/**
 * Loturile: cele demonstrative (src/data/lots.ts) + cele create din panou (baza de date).
 * Locurile rezervate = rezervările inițiale ale lotului + puii din precomenzile active alocate pe el.
 */
async function allLots(): Promise<Lot[]> {
  const [stored, preorders] = await Promise.all([
    store.list<StoredLot>(LOTS),
    store.list<{ lotCode: string | null; birds: number; status: string }>("preorders"),
  ]);
  const booked = new Map<string, number>();
  for (const p of preorders) {
    if (p.lotCode && p.status !== "anulata") booked.set(p.lotCode, (booked.get(p.lotCode) ?? 0) + p.birds);
  }
  const storedCodes = new Set(stored.map((l) => l.code));
  return [...lots.filter((l) => !storedCodes.has(l.code)), ...stored].map((l) => ({
    ...l,
    reservedBirds: Math.min(l.totalBirds, l.reservedBirds + (booked.get(l.code) ?? 0)),
  }));
}

export type NewLot = Pick<Lot, "farmSlug" | "species" | "breed" | "startDate" | "growthDays" | "totalBirds" | "feed" | "processor" | "notes" | "pens">;

/** Implicit doar loturile aprobate (publice); `{ all: true }` în panouri. */
type LotScope = { all?: boolean };
const scoped = async ({ all = false }: LotScope = {}) => (await allLots()).filter((l) => all || isApproved(l));

export const lotRepository = {
  async list(scope?: LotScope): Promise<Lot[]> {
    return (await scoped(scope)).sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
  async byCode(code: string, scope?: LotScope): Promise<Lot | null> {
    const c = normalizeLotCode(code);
    return (await scoped(scope)).find((l) => l.code === c) ?? null;
  },
  async byFarm(slug: string, scope?: LotScope): Promise<Lot[]> {
    return (await scoped(scope)).filter((l) => l.farmSlug === slug).sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
  /** Loturi deschise pentru precomenzi – doar din gospodăriile active, nesuspendate. */
  async openForPreorder(now = new Date()): Promise<Lot[]> {
    const active = await activeFarmSlugs();
    for (const g of await store.list<{ id: string; standing: string }>("farm-governance")) {
      if (g.standing === "suspendata" || g.standing === "exclusa") active.delete(g.id);
    }
    return (await allLots())
      .filter((l) => active.has(l.farmSlug) && isOpenForPreorder(l, now))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
  /** `needsApproval`: lot propus de gospodar, devine public după aprobarea adminului. */
  async create(data: NewLot, createdBy: string, needsApproval = false): Promise<Lot> {
    const existing = new Set((await allLots()).map((l) => l.code));
    const farm = (await allFarms()).find((f) => f.slug === data.farmSlug);
    const code = lotCodeFor(farm?.village ?? data.farmSlug, data.startDate, existing);
    const lot: StoredLot = {
      ...data,
      id: code,
      code,
      reservedBirds: 0,
      createdAt: new Date().toISOString(),
      createdBy,
      ...(needsApproval ? { approval: { status: "asteapta" as const } } : {}),
    };
    await store.append(LOTS, lot);
    return lot;
  },
  /** Modifică un lot; pentru loturile demonstrative se salvează o copie în baza de date. */
  async update(code: string, patch: Partial<Pick<Lot, "totalBirds" | "startDate" | "growthDays" | "breed" | "feed" | "processor" | "notes" | "closed" | "approval" | "pens" | "penStarts">>) {
    const stored = await store.get<StoredLot>(LOTS, code);
    if (stored) return store.update<StoredLot>(LOTS, code, patch);
    const demo = lots.find((l) => l.code === code);
    if (!demo) return null;
    return store.append<StoredLot>(LOTS, { ...demo, ...patch, id: code });
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
