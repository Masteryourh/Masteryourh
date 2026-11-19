import { z } from "zod";
import { checkbox, emailSchema, nameSchema, phoneSchema } from "./common";

export const romanianCounties = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brăila", "Brașov", "București",
  "Buzău", "Călărași", "Caraș-Severin", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt",
  "Prahova", "Sălaj", "Satu Mare", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea",
] as const;

export const dsvLabels = {
  inregistrat: "Da, sunt înregistrat la DSV",
  "in-curs": "Înregistrare în curs",
  neinregistrat: "Nu încă",
} as const;

export const partnerApplicationSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  farmName: z.string().trim().max(80, "Numele gospodăriei este prea lung.").default(""),
  village: z.string().trim().min(2, "Introdu localitatea.").max(60, "Numele localității este prea lung."),
  county: z.enum(romanianCounties, { message: "Alege județul." }),
  capacity: z.coerce
    .number({ message: "Introdu numărul estimat de pui." })
    .int("Introdu un număr întreg.")
    .min(20, "Capacitatea minimă pentru un lot este de 20 de pui.")
    .max(5000, "Pentru peste 5.000 de pui pe lot, scrie-ne direct."),
  experienceYears: z.coerce
    .number({ message: "Introdu numărul de ani." })
    .int("Introdu un număr întreg.")
    .min(0, "Valoarea nu poate fi negativă.")
    .max(80, "Verifică numărul de ani."),
  hasShelter: checkbox,
  hasOutdoorArea: checkbox,
  dsvStatus: z.enum(["inregistrat", "in-curs", "neinregistrat"], { message: "Alege situația înregistrării la DSV." }),
  message: z.string().trim().max(1500, "Mesajul poate avea maximum 1500 de caractere.").default(""),
  termsConsent: checkbox.refine((v) => v, { message: "Este necesar acordul pentru prelucrarea datelor." }),
  website: z.string().max(0).optional().or(z.literal("")),
});

/** Editarea unei gospodării din panoul de administrare. */
export const farmEditSchema = z.object({
  name: z.string().trim().min(3, "Numele este prea scurt.").max(80),
  owner: z.string().trim().min(3, "Completează proprietarul.").max(80),
  village: z.string().trim().min(2, "Completează localitatea.").max(60),
  county: z.string().trim().min(2, "Completează județul.").max(40),
  capacityPerLot: z.coerce.number().int().min(1, "Capacitatea trebuie să fie pozitivă.").max(100000),
  shortDescription: z.string().trim().min(10, "Descrierea scurtă e prea scurtă.").max(220),
  description: z.string().trim().min(10, "Descrierea e prea scurtă.").max(3000),
  practices: z
    .string()
    .trim()
    .transform((v) => v.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12)),
  veterinaryRegistration: z.string().trim().max(160).default(""),
});
