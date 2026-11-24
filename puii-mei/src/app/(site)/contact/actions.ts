"use server";

import { flattenErrors } from "@/lib/validation/common";
import { contactSchema } from "@/lib/validation/contact";
import { contactRepository } from "@/server/repositories/contact";
import { notifyNewContactMessage } from "@/server/notifications";
import { auditedAction } from "@/server/audit";

export type ContactFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | { status: "success"; name: string };

async function submitContact__impl(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", errors: flattenErrors(parsed.error), values: raw };
  }
  const { termsConsent: _t, website, ...data } = parsed.data;
  void _t;
  if (website) {
    return { status: "error", errors: { form: "Mesajul nu a putut fi trimis." }, values: raw };
  }
  try {
    const msg = await contactRepository.create(data);
    await notifyNewContactMessage(msg);
    return { status: "success", name: data.name.split(" ")[0] };
  } catch (err) {
    console.error("[puii-mei] Eroare la salvarea mesajului", err);
    return {
      status: "error",
      errors: { form: "Mesajul nu a putut fi trimis. Te rugăm să încerci din nou." },
      values: raw,
    };
  }
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const submitContact = auditedAction({ action: "public.contact.submitContact", workspace: "public", resourceType: "contact", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, submitContact__impl);
