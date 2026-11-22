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
  canTurkeys: checkbox,
  canDucks: checkbox,
  canPheasants: checkbox,
  hasGreenhouse: checkbox,
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

export const investmentRangeLabels = {
  "sub-10k": "Sub 10.000 €",
  "10k-50k": "10.000 – 50.000 €",
  "50k-200k": "50.000 – 200.000 €",
  "peste-200k": "Peste 200.000 €",
  nestabilit: "Încă nu am stabilit",
} as const;

export const investorTypeLabels = {
  "persoana-fizica": "Persoană fizică",
  companie: "Companie",
} as const;

export const investorApplicationSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    investorType: z.enum(["persoana-fizica", "companie"], { message: "Alege tipul de investitor." }),
    company: z.string().trim().max(120, "Numele companiei este prea lung.").default(""),
    interestLots: checkbox,
    interestInfrastructure: checkbox,
    interestExpansion: checkbox,
    amountRange: z.enum(["sub-10k", "10k-50k", "50k-200k", "peste-200k", "nestabilit"], {
      message: "Alege un interval orientativ.",
    }),
    region: z.string().trim().max(120, "Textul este prea lung.").default(""),
    message: z.string().trim().max(1500, "Mesajul poate avea maximum 1500 de caractere.").default(""),
    termsConsent: checkbox.refine((v) => v, { message: "Este necesar acordul pentru prelucrarea datelor." }),
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    if (d.investorType === "companie" && d.company.length < 2) {
      ctx.addIssue({ code: "custom", path: ["company"], message: "Completează numele companiei." });
    }
    if (!d.interestLots && !d.interestInfrastructure && !d.interestExpansion) {
      ctx.addIssue({ code: "custom", path: ["interests"], message: "Alege cel puțin un domeniu de interes." });
    }
  });

export const interestSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: z.string().trim().max(20).default(""),
    county: z.enum(romanianCounties, { message: "Alege județul." }),
    curcani: checkbox,
    rate: checkbox,
    fazani: checkbox,
    "legume-sera": checkbox,
    borcane: checkbox,
    afumaturi: checkbox,
    pastravi: checkbox,
    congelator: checkbox,
    termsConsent: checkbox.refine((v) => v, { message: "Este necesar acordul pentru prelucrarea datelor." }),
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    if (!d.curcani && !d.rate && !d.fazani && !d["legume-sera"] && !d.borcane && !d.afumaturi && !d.pastravi && !d.congelator) {
      ctx.addIssue({ code: "custom", path: ["products"], message: "Alege cel puțin un produs." });
    }
  });
