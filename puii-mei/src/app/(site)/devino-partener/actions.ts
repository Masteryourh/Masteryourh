"use server";

import { flattenErrors } from "@/lib/validation/common";
import { investorApplicationSchema, partnerApplicationSchema } from "@/lib/validation/partner";
import { applicationRepository, investorRepository } from "@/server/repositories/applications";
import { notifyNewFarmApplication, notifyNewInvestorApplication } from "@/server/notifications";
import { auditedAction } from "@/server/audit";

export type PartnerFormState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string>; values: Record<string, string> }
  | { status: "success"; name: string };

async function submitPartnerApplication__impl(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;
  const parsed = partnerApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", errors: flattenErrors(parsed.error), values: raw };
  }
  const { termsConsent: _t, website, ...data } = parsed.data;
  void _t;
  if (website) {
    return { status: "error", errors: { form: "Cererea nu a putut fi trimisă." }, values: raw };
  }
  try {
    const app = await applicationRepository.create(data);
    await notifyNewFarmApplication(app);
    return { status: "success", name: data.name.split(" ")[0] };
  } catch (err) {
    console.error("[puii-mei] Eroare la salvarea solicitării de parteneriat", err);
    return {
      status: "error",
      errors: { form: "Solicitarea nu a putut fi trimisă. Te rugăm să încerci din nou sau să ne suni." },
      values: raw,
    };
  }
}

async function submitInvestorApplication__impl(
  _prev: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  ) as Record<string, string>;
  const parsed = investorApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", errors: flattenErrors(parsed.error), values: raw };
  }
  const { termsConsent: _t, website, ...data } = parsed.data;
  void _t;
  if (website) {
    return { status: "error", errors: { form: "Cererea nu a putut fi trimisă." }, values: raw };
  }
  try {
    const app = await investorRepository.create({
      ...data,
      company: data.investorType === "companie" ? data.company : "",
    });
    await notifyNewInvestorApplication(app);
    return { status: "success", name: data.name.split(" ")[0] };
  } catch (err) {
    console.error("[puii-mei] Eroare la salvarea solicitării de investitor", err);
    return {
      status: "error",
      errors: { form: "Solicitarea nu a putut fi trimisă. Te rugăm să încerci din nou sau să ne suni." },
      values: raw,
    };
  }
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const submitPartnerApplication = auditedAction({ action: "public.devino-partener.submitPartnerApplication", workspace: "public", resourceType: "devino-partener", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, submitPartnerApplication__impl);
export const submitInvestorApplication = auditedAction({ action: "public.devino-partener.submitInvestorApplication", workspace: "public", resourceType: "devino-partener", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, submitInvestorApplication__impl);
