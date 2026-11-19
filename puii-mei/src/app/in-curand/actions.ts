"use server";

import { flattenErrors } from "@/lib/validation/common";
import { interestSchema } from "@/lib/validation/partner";
import { upcomingProducts } from "@/lib/products";
import { interestRepository } from "@/server/repositories/interest";

export type InterestFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | { status: "success"; name: string };

export async function submitInterest(_prev: InterestFormState, formData: FormData): Promise<InterestFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;
  const parsed = interestSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", errors: flattenErrors(parsed.error), values: raw };
  const d = parsed.data;
  if (d.website) return { status: "error", errors: { form: "Cererea nu a putut fi trimisă." }, values: raw };
  try {
    await interestRepository.create({
      name: d.name,
      email: d.email,
      phone: d.phone,
      county: d.county,
      products: upcomingProducts.map((p) => p.id).filter((id) => d[id]),
    });
    return { status: "success", name: d.name.split(" ")[0] };
  } catch (err) {
    console.error("[puii-mei] Eroare la salvarea înscrierii", err);
    return { status: "error", errors: { form: "Înscrierea nu a putut fi salvată. Te rugăm să încerci din nou." }, values: raw };
  }
}
