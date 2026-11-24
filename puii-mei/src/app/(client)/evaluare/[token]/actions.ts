"use server";

import { revalidatePath } from "next/cache";
import { ratingState } from "@/lib/delivery";
import { flattenErrors } from "@/lib/validation/common";
import { ratingSchema } from "@/lib/validation/confirmation";
import { parcelRepository as confirmationRepository } from "@/server/repositories/delivery";
import { auditedAction } from "@/server/audit";

export type RatingFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

async function submitRating__impl(token: string, _prev: RatingFormState, formData: FormData): Promise<RatingFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;
  const confirmation = await confirmationRepository.byRatingToken(token);
  if (!confirmation) return { status: "error", errors: { form: "Linkul nu este valid." }, values: raw };
  const state = ratingState(confirmation);
  if (state === "trimis") return { status: "error", errors: { form: "Evaluarea a fost deja trimisă." }, values: raw };
  if (state === "expirat") return { status: "error", errors: { form: "Linkul de evaluare a expirat." }, values: raw };

  const parsed = ratingSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", errors: flattenErrors(parsed.error), values: raw };
  await confirmationRepository.update(confirmation.id, {
    ratingSubmittedAt: new Date().toISOString(),
    ratings: parsed.data,
  });
  revalidatePath(`/evaluare/${token}`);
  revalidatePath("/admin", "layout");
  return { status: "idle" };
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const submitRating = auditedAction({ action: "customer.evaluare.submitRating", workspace: "customer", resourceType: "evaluare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, submitRating__impl);
