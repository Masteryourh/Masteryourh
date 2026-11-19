import type { IconName } from "@/components/ui/Icon";

export const steps: { title: string; text: string; detail: string; icon: IconName }[] = [
  {
    title: "Alegi cantitatea",
    text: "Stabilești câți pui vrei și vezi imediat valoarea estimativă a comenzii.",
    detail:
      "Poți alege un lot anume sau primul lot disponibil. Prețul este estimat pe baza greutății medii și se confirmă la cântărire.",
    icon: "scale",
  },
  {
    title: "Plasezi precomanda",
    text: "Completezi un formular scurt. Nu plătești nimic online în acest moment.",
    detail:
      "Primești un număr de precomandă și te sunăm pentru confirmare. Comenzile adunate ne permit să planificăm exact câți pui creștem.",
    icon: "clipboard",
  },
  {
    title: "Noi organizăm creșterea",
    text: "Puii tăi cresc într-o gospodărie parteneră monitorizată, fără grabă.",
    detail:
      "Asigurăm puii de o zi din incubatoare autorizate, furajele și monitorizarea veterinară. Gospodăriile respectă un protocol comun de creștere.",
    icon: "sprout",
  },
  {
    title: "Urmărești evoluția",
    text: "Fiecare lot are un cod unic. Vezi etapa de creștere și data estimată.",
    detail:
      "Pe pagina de trasabilitate vezi gospodăria, data începerii creșterii, etapa curentă și data estimată a disponibilității.",
    icon: "chart",
  },
  {
    title: "Primești puiul proaspăt",
    text: "După procesarea într-o unitate autorizată, livrăm în lanț frigorific.",
    detail:
      "Puii sunt sacrificați și ambalați într-un abator autorizat sanitar-veterinar, etichetați cu codul lotului și livrați în zona aleasă.",
    icon: "truck",
  },
];
