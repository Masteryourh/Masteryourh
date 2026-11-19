import type { ConfirmationState, DeliveryConfirmation } from "./domain";

/** Câte ore are clientul să confirme primirea după marcarea ca livrată. */
export const CONFIRMATION_WINDOW_HOURS = 12;
/** Câte zile rămâne deschis linkul de evaluare după confirmare. */
export const RATING_WINDOW_DAYS = 7;

/** Cele 4 laturi ale coletului fotografiate de client. */
export const PHOTO_SIDES = ["Latura 1", "Latura 2", "Latura 3", "Latura 4"] as const;

export function confirmationState(c: DeliveryConfirmation, now = new Date()): ConfirmationState {
  if (c.submittedAt) return c.answers?.conditionOk ? "confirmat" : "problema";
  if (!c.deliveredAt || !c.expiresAt) return "neexpediat";
  return now.getTime() > new Date(c.expiresAt).getTime() ? "expirat" : "asteapta";
}

export type RatingState = "indisponibil" | "asteapta" | "trimis" | "expirat";

export function ratingState(c: DeliveryConfirmation, now = new Date()): RatingState {
  if (c.ratingSubmittedAt) return "trimis";
  if (!c.ratingToken || !c.ratingExpiresAt) return "indisponibil";
  return now.getTime() > new Date(c.ratingExpiresAt).getTime() ? "expirat" : "asteapta";
}

export const confirmationStateLabels: Record<ConfirmationState, string> = {
  neexpediat: "Etichetă tipărită, nepredat",
  asteapta: "Așteaptă confirmarea",
  confirmat: "Confirmat în condiții bune",
  problema: "Problemă semnalată",
  expirat: "Expirat, fără răspuns",
};

export const ratingTargets = [
  { key: "farm", label: "Gospodăria", hint: "Calitatea puilor primiți" },
  { key: "courier", label: "Curierul", hint: "Predarea: punctualitate, ambalare, temperatură" },
  { key: "platform", label: "Puii mei", hint: "Precomanda, informarea și comunicarea" },
] as const;
