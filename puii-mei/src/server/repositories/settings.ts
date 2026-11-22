import "server-only";
import { store } from "@/server/db/store";
import { clientPricePerKg, pricing } from "@/lib/pricing";

const COLLECTION = "settings";
const PRICE_ID = "preturi";

export interface PriceChange {
  at: string;
  by: string;
  marketPricePerKg: number;
  markupPct: number;
  note?: string;
}

export interface PriceSettings {
  id: string;
  marketPricePerKg: number;
  markupPct: number;
  updatedAt?: string;
  updatedBy?: string;
  history: PriceChange[];
}

const defaults: PriceSettings = {
  id: PRICE_ID,
  marketPricePerKg: pricing.marketPricePerKg,
  markupPct: pricing.markupPct,
  history: [],
};

/** Prețul pieței și adaosul, editabile din admin. Comenzile existente își păstrează prețul de la plasare. */
export const priceSettingsRepository = {
  async get(): Promise<PriceSettings & { pricePerKg: number }> {
    const s = (await store.get<PriceSettings>(COLLECTION, PRICE_ID)) ?? defaults;
    return { ...s, pricePerKg: clientPricePerKg(s.marketPricePerKg, s.markupPct) };
  },
  async save(change: PriceChange) {
    const current = await store.get<PriceSettings>(COLLECTION, PRICE_ID);
    const patch = { marketPricePerKg: change.marketPricePerKg, markupPct: change.markupPct, updatedAt: change.at, updatedBy: change.by };
    if (!current) return store.append<PriceSettings>(COLLECTION, { ...defaults, ...patch, history: [change] });
    return store.update<PriceSettings>(COLLECTION, PRICE_ID, { ...patch, history: [change, ...current.history].slice(0, 50) });
  },
};

export const currentPricePerKg = async () => (await priceSettingsRepository.get()).pricePerKg;
