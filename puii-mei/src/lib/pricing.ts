import type { DeliveryZone, PriceEstimate } from "./domain";

/**
 * Parametri comerciali pentru estimarea prețului.
 * Prețul final se confirmă la cântărirea fiecărui pui după sacrificare.
 */
export const pricing = {
  pricePerKg: 34, // lei / kg carcasă, TVA inclus (estimativ)
  avgWeightKg: 5, // greutate medie per pui (kg)
  /** Hrana plătită în avans: aproximativ 6 kg de furaj pentru fiecare pui. */
  feedKgPerBird: 6,
  /** Preț orientativ al furajului (lei / kg); fiecare gospodărie își poate seta prețul ei. */
  feedPricePerKg: 3.5,
  /** Preț orientativ al puiului de o zi (lei / pui); fiecare gospodărie își poate seta prețul ei. */
  chickPrice: 7,
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

/**
 * Avansul (plătit acum, direct gospodăriei): puii de o zi + furajul (~6 kg / pui).
 * Avansul NU e un cost în plus: se scade din prețul total, la livrare.
 */
export function feedAdvance(birds: number, pricePerKg: number = pricing.feedPricePerKg, chickPrice: number = pricing.chickPrice) {
  const n = Math.max(0, Math.floor(birds));
  const kg = n * pricing.feedKgPerBird;
  const feedAmount = round(kg * pricePerKg, 2);
  const chickAmount = round(n * chickPrice, 2);
  return { birds: n, kg, pricePerKg, feedAmount, chickPrice, chickAmount, amount: round(feedAmount + chickAmount, 2) };
}

/** Împărțirea prețului: total estimat = avans (acum) + rest de plată la livrare. */
export function paymentSplit(total: number, advance: number) {
  return { total, advance, atDelivery: round(Math.max(0, total - advance), 2) };
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
