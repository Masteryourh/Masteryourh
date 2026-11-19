import { z } from "zod";
import { checkbox, emailSchema, nameSchema } from "./common";

export const contactSubjects = [
  "Întrebare despre precomenzi",
  "Vreau să devin gospodărie parteneră",
  "Colaborare / presă",
  "Altceva",
] as const;

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().trim().max(20).default(""),
  subject: z.enum(contactSubjects, { message: "Alege subiectul mesajului." }),
  message: z
    .string()
    .trim()
    .min(10, "Mesajul trebuie să aibă cel puțin 10 caractere.")
    .max(2000, "Mesajul poate avea maximum 2000 de caractere."),
  termsConsent: checkbox.refine((v) => v, {
    message: "Este necesar acordul pentru prelucrarea datelor.",
  }),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;
