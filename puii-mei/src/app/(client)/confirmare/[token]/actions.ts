"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PHOTO_SIDES, confirmationOpen } from "@/lib/delivery";
import { flattenErrors } from "@/lib/validation/common";
import { confirmationSchema } from "@/lib/validation/confirmation";
import { logClientConfirmation, openRating } from "@/server/delivery";
import { parcelRepository, photoRepository } from "@/server/repositories/delivery";
import { auditedAction } from "@/server/audit";

export type ConfirmationFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

/** Lista de verificare a clientului + 4 fotografii. După trimitere nu se mai poate modifica. */
async function submitConfirmation__impl(
  token: string,
  _prev: ConfirmationFormState,
  formData: FormData,
): Promise<ConfirmationFormState> {
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) raw[k] = v;

  const parcel = await parcelRepository.byClientToken(token);
  if (!parcel) return { status: "error", errors: { form: "Linkul nu este valid." }, values: raw };
  if (parcel.submittedAt) {
    return { status: "error", errors: { form: "Confirmarea a fost deja trimisă și nu mai poate fi modificată." }, values: raw };
  }
  if (!parcel.delivered) return { status: "error", errors: { form: "Coletul nu a fost încă predat de curier." }, values: raw };
  if (!confirmationOpen(parcel)) return { status: "error", errors: { form: "Termenul de confirmare a expirat." }, values: raw };

  const errors: Record<string, string> = {};
  const parsed = confirmationSchema.safeParse(raw);
  if (!parsed.success) Object.assign(errors, flattenErrors(parsed.error));

  const photos = PHOTO_SIDES.map((_, i) => formData.get(`photo${i + 1}`)).map((f) =>
    f instanceof File && f.size > 0 ? f : null,
  );
  photos.forEach((f, i) => {
    if (!f) errors[`photo${i + 1}`] = "Adaugă fotografia.";
    else if (!f.type.startsWith("image/")) errors[`photo${i + 1}`] = "Fișierul trebuie să fie o imagine.";
    else if (f.size > MAX_PHOTO_BYTES) errors[`photo${i + 1}`] = "Imaginea este prea mare.";
  });

  let conditionOk = false;
  if (parsed.success) {
    const d = parsed.data;
    conditionOk = d.packagingOk && d.coldOk && d.appearanceOk && d.birdsReceived === parcel.birds;
    if (!conditionOk && d.problem.length < 10) {
      errors.problem = "Ceva nu a fost în regulă: descrie pe scurt problema (cel puțin 10 caractere).";
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) return { status: "error", errors, values: raw };

  const d = parsed.data;
  const photoIds: string[] = [];
  for (const f of photos) photoIds.push(await photoRepository.save(f!, `parcel:${parcel.id}`));
  const updated = await parcelRepository.update(parcel.id, {
    submittedAt: new Date().toISOString(),
    answers: {
      birdsReceived: d.birdsReceived,
      packagingOk: d.packagingOk,
      coldOk: d.coldOk,
      appearanceOk: d.appearanceOk,
      conditionOk,
      problem: d.problem,
      photoIds,
    },
  });
  await logClientConfirmation(parcel, conditionOk);
  // Confirmarea deschide lista de satisfacție.
  const rated = await openRating(updated ?? parcel);
  revalidatePath("/admin", "layout");
  revalidatePath("/cont/gospodar", "layout");
  redirect(`/evaluare/${rated.ratingToken}?multumim=1`);
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const submitConfirmation = auditedAction({ action: "customer.confirmare.submitConfirmation", workspace: "customer", resourceType: "confirmare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, submitConfirmation__impl);
