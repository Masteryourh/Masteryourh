import type { Parcel, Tour } from "./domain";

/** Setări ale livrărilor (pot deveni configurabile din admin). */
export const DELIVERY = {
  /** Durata implicită a unei ture, de la ridicare până la ultima livrare. */
  defaultTourHours: 6,
  /** Lanțul de frig pentru carne proaspătă (°C). */
  tempMin: 0,
  tempMax: 4,
  /** Zile de la disponibilitatea lotului până la data limită de consum. */
  shelfLifeDays: 5,
  /** Ore în care clientul poate confirma primirea după predare. */
  confirmationHours: 12,
  /** Zile în care rămâne deschisă lista de satisfacție. */
  ratingDays: 7,
  /** Încercări de PIN greșite până la blocare. */
  maxPinAttempts: 5,
} as const;

export const PHOTO_SIDES = ["Latura 1", "Latura 2", "Latura 3", "Latura 4"] as const;

export const vehicleTypes = ["Frigorifică", "Izotermă", "Autoturism cu lăzi frigorifice"] as const;

export const extensionReasons = [
  "Trafic sau drum blocat",
  "Vreme",
  "Client absent",
  "Defecțiune auto",
  "Altul",
] as const;

export const tourStatusLabels: Record<Tour["status"], string> = {
  planificata: "Planificată",
  "in-curs": "În curs",
  incheiata: "Încheiată",
  anulata: "Anulată",
};

export const tempOk = (t: number) => t >= DELIVERY.tempMin && t <= DELIVERY.tempMax;

/** Termenul efectiv al turei, cu prelungirile aprobate. */
export function tourDeadline(t: Tour): Date | null {
  if (!t.deadlineAt) return null;
  const extra = t.extensions.filter((e) => e.status === "aprobata").reduce((s, e) => s + (e.hours ?? 0), 0);
  return new Date(new Date(t.deadlineAt).getTime() + extra * 3600_000);
}

export function tourExpired(t: Tour, now = new Date()) {
  const d = tourDeadline(t);
  return Boolean(d && now > d && t.status === "in-curs");
}

export type ParcelStage = "eticheta" | "in-tura" | "incarcat" | "livrat" | "confirmat" | "problema";

export function parcelStage(p: Parcel): ParcelStage {
  if (p.submittedAt) return p.answers?.conditionOk ? "confirmat" : "problema";
  if (p.delivered) return "livrat";
  if (p.loaded) return "incarcat";
  if (p.tourId) return "in-tura";
  return "eticheta";
}

export const parcelStageLabels: Record<ParcelStage, string> = {
  eticheta: "Etichetă generată",
  "in-tura": "Planificat în tură",
  incarcat: "Încărcat la ridicare",
  livrat: "Predat clientului",
  confirmat: "Confirmat de client",
  problema: "Problemă semnalată",
};

/** Clientul mai poate confirma primirea? */
export function confirmationOpen(p: Parcel, now = new Date()) {
  return Boolean(
    p.delivered && !p.submittedAt && p.confirmationDeadline && now <= new Date(p.confirmationDeadline),
  );
}

export const ratingTargets = [
  { key: "farm", label: "Gospodăria", hint: "Calitatea puilor primiți" },
  { key: "courier", label: "Curierul", hint: "Predarea: punctualitate, ambalare, temperatură" },
  { key: "platform", label: "Puii mei", hint: "Precomanda, informarea și comunicarea" },
] as const;

export type RatingState = "indisponibil" | "asteapta" | "trimis" | "expirat";

export function ratingState(p: Parcel, now = new Date()): RatingState {
  if (p.ratingSubmittedAt) return "trimis";
  if (!p.ratingToken || !p.ratingExpiresAt) return "indisponibil";
  return now > new Date(p.ratingExpiresAt) ? "expirat" : "asteapta";
}
