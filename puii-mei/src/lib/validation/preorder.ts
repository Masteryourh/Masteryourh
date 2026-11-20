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
    addressNote: z.string().trim().max(200, "Textul este prea lung.").default(""),
    lat: z.string().default(""),
    lng: z.string().default(""),
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
    if (needsAddress && !parseLocation(data.lat, data.lng)) {
      ctx.addIssue({ code: "custom", path: ["location"], message: "Pune pinul pe hartă, pe locul exact al livrării." });
    }
  });

/** Coordonatele pinului, doar dacă sunt valide și în România. */
export function parseLocation(lat: string, lng: string) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!lat || !lng || !Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < 43.5 || la > 48.4 || ln < 20.1 || ln > 29.8) return null;
  return { lat: Math.round(la * 1e6) / 1e6, lng: Math.round(ln * 1e6) / 1e6 };
}

export type PreorderInput = z.infer<typeof preorderSchema>;
export type PreorderField = keyof PreorderInput;
