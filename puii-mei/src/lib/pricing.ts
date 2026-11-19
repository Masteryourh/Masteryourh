import type { DeliveryZone, PriceEstimate } from "./domain";

/**
 * Parametri comerciali pentru estimarea prețului.
 * Prețul final se confirmă la cântărirea fiecărui pui după procesare.
 */
export const pricing = {
  pricePerKg: 34, // lei / kg carcasă, TVA inclus (estimativ)
  avgWeightKg: 2.2, // greutate medie carcasă
  minBirds: 2,
  maxBirds: 100,
  presets: [4, 8, 12, 20],
  /** Peste acest prag de produs, livrarea devine gratuită. */
  freeDeliveryFrom: 600,
} as const;

export function estimatePrice(birds: number, zone?: DeliveryZone | null): PriceEstimate {
  const safeBirds = Math.max(0, Math.floor(birds));
  const estimatedKg = round(safeBirds * pricing.avgWeightKg, 1);
  const productValue = round(estimatedKg * pricing.pricePerKg, 2);
  const deliveryFee =
    !zone || productValue >= pricing.freeDeliveryFrom ? 0 : zone.fee;
  return {
    birds: safeBirds,
    avgWeightKg: pricing.avgWeightKg,
    pricePerKg: pricing.pricePerKg,
    estimatedKg,
    productValue,
    deliveryFee,
    total: round(productValue + deliveryFee, 2),
  };
}

function round(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
