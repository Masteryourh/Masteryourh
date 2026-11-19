import type { ConfirmationState, DeliveryConfirmation } from "./domain";

/** Câte ore are clientul să confirme primirea după marcarea ca livrată. */
export const CONFIRMATION_WINDOW_HOURS = 12;

export function confirmationState(c: DeliveryConfirmation, now = new Date()): ConfirmationState {
  if (c.submittedAt) return c.answers?.conditionOk ? "confirmat" : "problema";
  return now.getTime() > new Date(c.expiresAt).getTime() ? "expirat" : "asteapta";
}

export const confirmationStateLabels: Record<ConfirmationState, string> = {
  asteapta: "Așteaptă confirmarea",
  confirmat: "Confirmat în condiții bune",
  problema: "Problemă semnalată",
  expirat: "Expirat, fără răspuns",
};

export const ratingTargets = [
  { key: "ratingFarm", label: "Gospodăria", hint: "Calitatea puilor primiți" },
  { key: "ratingCourier", label: "Curierul", hint: "Predarea: punctualitate, ambalare, temperatură" },
  { key: "ratingPlatform", label: "Puii mei", hint: "Precomanda, informarea și comunicarea" },
] as const;
