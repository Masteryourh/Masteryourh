"use server";

import { revalidatePath } from "next/cache";
import { confirmationState } from "@/lib/confirmation";
import { flattenErrors } from "@/lib/validation/common";
import { confirmationSchema } from "@/lib/validation/confirmation";
import { confirmationRepository } from "@/server/repositories/confirmations";

export type ConfirmationFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

export async function submitConfirmation(
  token: string,
  _prev: ConfirmationFormState,
  formData: FormData,
): Promise<ConfirmationFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;

  const confirmation = await confirmationRepository.byToken(token);
  if (!confirmation) return { status: "error", errors: { form: "Linkul nu este valid." }, values: raw };
  const state = confirmationState(confirmation);
  if (state === "expirat") {
    return { status: "error", errors: { form: "Termenul de confirmare a expirat." }, values: raw };
  }
  if (state !== "asteapta") {
    return { status: "error", errors: { form: "Confirmarea a fost deja trimisă și nu mai poate fi modificată." }, values: raw };
  }

  const parsed = confirmationSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", errors: flattenErrors(parsed.error), values: raw };
  const d = parsed.data;

  await confirmationRepository.update(confirmation.id, {
    submittedAt: new Date().toISOString(),
    answers: {
      birdsReceived: d.birdsReceived,
      packagingOk: d.packagingOk === "da",
      coldOk: d.coldOk === "da",
      appearanceOk: d.appearanceOk === "da",
      conditionOk: d.conditionOk === "da",
      problem: d.problem,
      ratingFarm: d.ratingFarm,
      ratingCourier: d.ratingCourier,
      ratingPlatform: d.ratingPlatform,
      comment: d.comment,
    },
  });
  revalidatePath(`/confirmare/${token}`);
  revalidatePath("/admin", "layout");
  return { status: "idle" };
}
