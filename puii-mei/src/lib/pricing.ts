import type { DeliveryZone, PriceEstimate } from "./domain";

/**
 * Parametri comerciali pentru estimarea prețului.
 * Prețul final se confirmă la cântărirea fiecărui pui după sacrificare.
 */
export const pricing = {
  pricePerKg: 34, // lei / kg carcasă, TVA inclus (estimativ)
  avgWeightKg: 2.2, // greutate medie carcasă
  /** Hrana plătită în avans: aproximativ 6 kg de furaj pentru fiecare pui. */
  feedKgPerBird: 6,
  /** Preț orientativ al furajului (lei / kg); fiecare gospodărie își poate seta prețul ei. */
  feedPricePerKg: 3.5,
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

/** Avansul pentru hrană: cantitatea de furaj și suma (lei). */
export function feedAdvance(birds: number, pricePerKg: number = pricing.feedPricePerKg) {
  const kg = Math.max(0, Math.floor(birds)) * pricing.feedKgPerBird;
  return { kg, pricePerKg, amount: round(kg * pricePerKg, 2) };
}

export const feedPaymentLabels = {
  "de-platit": "De plătit",
  declarata: "Plătită de client (de verificat)",
  primita: "Primită",
} as const;

function round(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
