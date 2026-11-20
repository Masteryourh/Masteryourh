import { z } from "zod";

const rating = (label: string) =>
  z.coerce
    .number({ message: `Alege o notă pentru ${label}.` })
    .int()
    .min(1, `Alege o notă pentru ${label}.`)
    .max(5, `Alege o notă pentru ${label}.`);

const box = z
  .string()
  .optional()
  .transform((v) => v === "on");

export const confirmationSchema = z
  .object({
    birdsReceived: z.coerce
      .number({ message: "Introdu numărul de pui primiți." })
      .int("Introdu un număr întreg.")
      .min(0, "Numărul nu poate fi negativ.")
      .max(1000, "Verifică numărul de pui."),
    packagingOk: box,
    coldOk: box,
    appearanceOk: box,
    problem: z.string().trim().max(1500, "Textul poate avea maximum 1500 de caractere.").default(""),
  });

export const ratingSchema = z.object({
  farm: rating("gospodărie"),
  courier: rating("curier"),
  platform: rating("Puii mei"),
  comment: z.string().trim().max(1000, "Comentariul poate avea maximum 1000 de caractere.").default(""),
});
