"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PHOTO_SIDES, confirmationState } from "@/lib/confirmation";
import { flattenErrors } from "@/lib/validation/common";
import { confirmationSchema } from "@/lib/validation/confirmation";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { openRating } from "@/server/delivery";

export type ConfirmationFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> };

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

export async function submitConfirmation(
  token: string,
  _prev: ConfirmationFormState,
  formData: FormData,
): Promise<ConfirmationFormState> {
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) raw[k] = v;

  const confirmation = await confirmationRepository.byToken(token);
  if (!confirmation) return { status: "error", errors: { form: "Linkul nu este valid." }, values: raw };
  const state = confirmationState(confirmation);
  if (state === "neexpediat") {
    return { status: "error", errors: { form: "Comanda nu a fost încă marcată ca predată de curier." }, values: raw };
  }
  if (state === "expirat") return { status: "error", errors: { form: "Termenul de confirmare a expirat." }, values: raw };
  if (state !== "asteapta") {
    return { status: "error", errors: { form: "Confirmarea a fost deja trimisă și nu mai poate fi modificată." }, values: raw };
  }

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

  if (parsed.success) {
    const d = parsed.data;
    const ok = d.packagingOk && d.coldOk && d.appearanceOk && d.birdsReceived === confirmation.birdsOrdered;
    if (!ok && d.problem.length < 10) {
      errors.problem = "Ceva nu a fost în regulă: descrie pe scurt problema (cel puțin 10 caractere).";
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) return { status: "error", errors, values: raw };

  const d = parsed.data;
  const conditionOk = d.packagingOk && d.coldOk && d.appearanceOk && d.birdsReceived === confirmation.birdsOrdered;
  for (const [i, f] of photos.entries()) {
    const buf = Buffer.from(await f!.arrayBuffer());
    await confirmationRepository.savePhoto({
      id: `${confirmation.id}-${i + 1}`,
      confirmationId: confirmation.id,
      index: i + 1,
      mime: f!.type,
      data: buf.toString("base64"),
    });
  }
  const updated = await confirmationRepository.update(confirmation.id, {
    submittedAt: new Date().toISOString(),
    answers: {
      birdsReceived: d.birdsReceived,
      packagingOk: d.packagingOk,
      coldOk: d.coldOk,
      appearanceOk: d.appearanceOk,
      conditionOk,
      problem: d.problem,
      photos: photos.length,
    },
  });
  // Confirmarea deschide lista de satisfacție.
  const rated = await openRating(updated ?? confirmation);
  revalidatePath("/admin", "layout");
  revalidatePath("/curier");
  redirect(`/evaluare/${rated.ratingToken}?multumim=1`);
}
