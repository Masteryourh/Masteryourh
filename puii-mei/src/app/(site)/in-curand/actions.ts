"use server";

import { flattenErrors } from "@/lib/validation/common";
import { interestSchema } from "@/lib/validation/partner";
import { upcomingProducts } from "@/lib/products";
import { interestRepository } from "@/server/repositories/interest";
import { auditedAction } from "@/server/audit";

export type InterestFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | { status: "success"; name: string };

async function submitInterest__impl(_prev: InterestFormState, formData: FormData): Promise<InterestFormState> {
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

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const submitInterest = auditedAction({ action: "public.in-curand.submitInterest", workspace: "public", resourceType: "in-curand", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, submitInterest__impl);
