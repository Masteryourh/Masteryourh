import { z } from "zod";

const yesNo = (message: string) => z.enum(["da", "nu"], { message });
const rating = (label: string) =>
  z.coerce
    .number({ message: `Alege o notă pentru ${label}.` })
    .int()
    .min(1, `Alege o notă pentru ${label}.`)
    .max(5, `Alege o notă pentru ${label}.`);

export const confirmationSchema = z
  .object({
    birdsReceived: z.coerce
      .number({ message: "Introdu numărul de pui primiți." })
      .int("Introdu un număr întreg.")
      .min(0, "Numărul nu poate fi negativ.")
      .max(1000, "Verifică numărul de pui."),
    packagingOk: yesNo("Spune-ne dacă ambalajul a fost intact."),
    coldOk: yesNo("Spune-ne dacă puii au fost reci la primire."),
    appearanceOk: yesNo("Spune-ne dacă aspectul și mirosul au fost normale."),
    conditionOk: yesNo("Alege dacă ai primit comanda în condițiile promise."),
    problem: z.string().trim().max(1500, "Textul poate avea maximum 1500 de caractere.").default(""),
    ratingFarm: rating("gospodărie"),
    ratingCourier: rating("curier"),
    ratingPlatform: rating("Puii mei"),
    comment: z.string().trim().max(1000, "Comentariul poate avea maximum 1000 de caractere.").default(""),
  })
  .superRefine((d, ctx) => {
    if (d.conditionOk === "nu" && d.problem.length < 10) {
      ctx.addIssue({ code: "custom", path: ["problem"], message: "Descrie pe scurt problema (cel puțin 10 caractere)." });
    }
  });
