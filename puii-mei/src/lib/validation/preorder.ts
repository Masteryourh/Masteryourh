import { z } from "zod";
import { pricing } from "@/lib/pricing";
import { checkbox, emailSchema, nameSchema, phoneSchema } from "./common";

export const preorderSchema = z
  .object({
    birds: z.coerce
      .number({ message: "Alege numărul de pui." })
      .int("Numărul de pui trebuie să fie întreg.")
      .min(pricing.minBirds, `Comanda minimă este de ${pricing.minBirds} pui.`)
      .max(pricing.maxBirds, `Pentru peste ${pricing.maxBirds} de pui, contactează-ne direct.`),
    lotCode: z.string().trim().max(20).default(""),
    zoneId: z.string().trim().min(1, "Alege zona de livrare."),
    address: z.string().trim().max(200, "Adresa este prea lungă.").default(""),
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    notes: z.string().trim().max(500, "Mesajul poate avea maximum 500 de caractere.").default(""),
    termsConsent: checkbox.refine((v) => v, {
      message: "Este necesar acordul pentru prelucrarea datelor.",
    }),
    marketingConsent: checkbox,
    // câmp capcană anti-spam (trebuie să rămână gol)
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const needsAddress = !["ridicare-personala", "alta-zona"].includes(data.zoneId);
    if (needsAddress && data.address.length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Introdu adresa de livrare (stradă, număr, localitate).",
      });
    }
  });

export type PreorderInput = z.infer<typeof preorderSchema>;
export type PreorderField = keyof PreorderInput;
