"use server";

import { flattenErrors } from "@/lib/validation/common";
import { contactSchema } from "@/lib/validation/contact";
import { contactRepository } from "@/server/repositories/contact";
import { notifyNewContactMessage } from "@/server/notifications";

export type ContactFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | { status: "success"; name: string };

export async function submitContact(
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
