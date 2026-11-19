import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .refine((v) => /^(\+40|0040|0)7\d{8}$|^(\+40|0040|0)[23]\d{8}$/.test(v), {
    message: "Introdu un număr de telefon românesc valid (ex. 0722 123 456).",
  });

export const nameSchema = z
  .string()
  .trim()
  .min(3, "Numele trebuie să aibă cel puțin 3 caractere.")
  .max(80, "Numele este prea lung.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Introdu o adresă de email validă."));

/** Câmpurile de tip checkbox trimit „on” când sunt bifate. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
  .transform((v) => v === "on" || v === "true");

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
