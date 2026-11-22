"use server";

import { revalidatePath } from "next/cache";
import { ratingState } from "@/lib/delivery";
import { flattenErrors } from "@/lib/validation/common";
import { ratingSchema } from "@/lib/validation/confirmation";
import { parcelRepository as confirmationRepository } from "@/server/repositories/delivery";

export type RatingFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

export async function submitRating(token: string, _prev: RatingFormState, formData: FormData): Promise<RatingFormState> {
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
