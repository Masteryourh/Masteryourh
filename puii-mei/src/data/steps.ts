import type { IconName } from "@/components/ui/Icon";

export const steps: { title: string; text: string; detail: string; icon: IconName }[] = [
  {
    title: "Alegi cantitatea",
    text: "Stabilești câți pui vrei și plătești în avans hrana lor: aproximativ 6 kg de furaj pentru fiecare pui.",
    detail:
      "Poți alege un lot anume sau primul lot disponibil. Avansul pentru hrană se plătește direct în contul gospodăriei partenere care crește puii; detaliile de plată le primești la confirmarea precomenzii. Prețul cărnii este estimat pe baza greutății medii și se confirmă la cântărire.",
    icon: "scale",
  },
  {
    title: "Plasezi precomanda",
    text: "Completezi un formular scurt. Te sunăm pentru confirmare și îți comunicăm detaliile avansului pentru hrană.",
    detail:
      "Primești un număr de precomandă și te sunăm pentru confirmare. Precomenzile adunate le arată gospodăriilor partenere exact câți pui să crească.",
    icon: "clipboard",
  },
  {
    title: "Gospodăria îi crește",
    text: "Puii tăi cresc într-o gospodărie parteneră monitorizată, fără grabă.",
    detail:
      "Gospodăria parteneră crește puii cu hrana plătită în avans, după un protocol comun de creștere. Puii mei îi oferă consultanță și publică evidența fiecărui lot.",
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
    text: "Puii sunt sacrificați tradițional, în gospodăria în care au crescut.",
    detail:
      "Fiecare lot este sacrificat tradițional chiar în gospodăria în care a crescut, cu respectarea normelor sanitar-veterinare. Puii nu se mută între gospodării, iar fiecare este etichetat cu codul lotului și livrat proaspăt în zona aleasă.",
    icon: "truck",
  },
];
