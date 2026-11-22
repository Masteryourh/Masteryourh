import type { DeliveryZone, PriceEstimate } from "./domain";

/**
 * Parametri comerciali pentru estimarea prețului.
 * Prețul final se confirmă la cântărirea fiecărui pui după sacrificare.
 */
/** Modelul de creștere: pui pășunați, ~60 de zile (vezi docs/plan-platforma.md §1b). */
const CARCASS_WEIGHT_KG = 4.8; // greutatea medie a puiului curățat (gata de gătit) (pe care se calculează prețul)
const CARCASS_YIELD = 0.7; // puiul curățat ≈ 70% din greutatea în viu
const FEED_CONVERSION = 0.7; // ~70% din hrană se transformă în greutate (asimilare)
const MARKET_PRICE_PER_KG = 30; // prețul de referință al pieței (lei / kg carcasă) – se actualizează
const MARKUP_PCT = 20; // prețul la client: piața + 20–30%

const round1 = (n: number) => Math.round(n * 10) / 10;

export const pricing = {
  /** Greutatea în viu la sacrificare = curățat / 70%. */
  liveWeightKg: round1(CARCASS_WEIGHT_KG / CARCASS_YIELD),
  carcassYield: CARCASS_YIELD,
  feedConversion: FEED_CONVERSION,
  marketPricePerKg: MARKET_PRICE_PER_KG,
  markupPct: MARKUP_PCT,
  /** Prețul pe kg de carcasă pentru client = piața × (1 + adaos). */
  pricePerKg: Math.round(MARKET_PRICE_PER_KG * (1 + MARKUP_PCT / 100) * 100) / 100,
  /** Greutatea estimată a puiului curățat (gata de gătit), pe care se calculează prețul. */
  avgWeightKg: CARCASS_WEIGHT_KG,
  /** Furajul necesar pe pui = greutatea în viu / randamentul de asimilare (~9,8 kg). */
  feedKgPerBird: round1(CARCASS_WEIGHT_KG / CARCASS_YIELD / FEED_CONVERSION),
  /** Preț orientativ al furajului (lei / kg); fiecare gospodărie își poate seta prețul ei. */
  feedPricePerKg: 3.5,
  /** Preț orientativ al puiului de o zi (lei / pui); fiecare gospodărie își poate seta prețul ei. */
  chickPrice: 7,
  minBirds: 2,
  /** Comenzile mari (pentru congelator) se pot împărți automat în mai multe gospodării. */
  maxBirds: 400,
  presets: [4, 8, 12, 20],
  /** Peste acest prag de produs, livrarea devine gratuită. */
  freeDeliveryFrom: 600,
} as const;

/** Prețul pe kg pentru client = prețul pieței × (1 + adaos%). */
export const clientPricePerKg = (marketPricePerKg: number, markupPct: number) =>
  Math.round(marketPricePerKg * (1 + markupPct / 100) * 100) / 100;

/** `pricePerKg`: prețul curent setat din admin (implicit cel din cod). */
export function estimatePrice(birds: number, zone?: DeliveryZone | null, pricePerKg: number = pricing.pricePerKg): PriceEstimate {
  const safeBirds = Math.max(0, Math.floor(birds));
  const estimatedKg = round(safeBirds * pricing.avgWeightKg, 1);
  const productValue = round(estimatedKg * pricePerKg, 2);
  const deliveryFee =
    !zone || productValue >= pricing.freeDeliveryFrom ? 0 : zone.fee;
  return {
    birds: safeBirds,
    avgWeightKg: pricing.avgWeightKg,
    pricePerKg,
    estimatedKg,
    productValue,
    deliveryFee,
    total: round(productValue + deliveryFee, 2),
  };
}

/**
 * Avansul (plătit acum, direct gospodăriei): puii de o zi + furajul (~10 kg / pui).
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
