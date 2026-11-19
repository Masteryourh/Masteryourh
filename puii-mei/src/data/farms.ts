import type { Farm } from "@/lib/domain";

/**
 * Gospodării partenere – date demonstrative pentru faza pilot.
 * Se vor muta în baza de date și vor fi administrate din panoul de administrare.
 */
export const farms: Farm[] = [
  {
    slug: "gospodaria-muresan",
    name: "Gospodăria Mureșan",
    owner: "Familia Mureșan",
    village: "Feleacu",
    county: "Cluj",
    coordinates: { lat: 46.711, lng: 23.598 },
    since: 2026,
    capacityPerLot: 250,
    shortDescription:
      "Gospodărie de familie pe dealurile Feleacului, cu adăpost nou și padoc înierbat de 1.200 m².",
    description:
      "Familia Mureșan crește păsări de trei generații. În parteneriat cu Puii mei, a amenajat un adăpost nou, ventilat natural, cu acces zilnic la un padoc înierbat. Puii sunt hrăniți cu furaje din cereale, completate cu porumb din producția proprie în etapa de finisare.",
    practices: [
      "Acces zilnic la padoc înierbat",
      "Furaje fără antibiotice ca promotori de creștere",
      "Densitate redusă în adăpost",
      "Jurnal zilnic de creștere: greutate, hrană, apă",
    ],
    photos: [
      { src: "/images/gospodarii/muresan-1.jpg", alt: "Pui în padocul Gospodăriei Mureșan" },
      { src: "/images/gospodarii/muresan-2.jpg", alt: "Adăpostul pentru pui din Feleacu" },
      { src: "/images/gospodarii/muresan-3.jpg", alt: "Familia Mureșan în gospodărie" },
    ],
    veterinaryRegistration: "Înregistrare sanitar-veterinară: în curs de publicare",
  },
  {
    slug: "ferma-de-la-deal",
    name: "Ferma de la Deal",
    owner: "Ioana și Mihai Pop",
    village: "Vultureni",
    county: "Cluj",
    coordinates: { lat: 46.968, lng: 23.575 },
    since: 2026,
    capacityPerLot: 300,
    shortDescription:
      "Doi tineri întorși în sat, care au transformat vechiul grajd într-un adăpost modern pentru păsări.",
    description:
      "Ioana și Mihai s-au întors în satul bunicilor și au ales să crească păsări după reguli clare, cu evidență completă. Adăpostul are iluminare naturală, așternut de paie schimbat regulat și un sistem de adăpare automat. Fiecare lot este monitorizat zilnic și raportat în platforma Puii mei.",
    practices: [
      "Iluminare naturală și așternut de paie",
      "Adăpare automată cu apă din fântână analizată",
      "Monitorizare zilnică raportată în platformă",
      "Vizite periodice ale medicului veterinar",
    ],
    photos: [
      { src: "/images/gospodarii/deal-1.jpg", alt: "Adăpostul Fermei de la Deal" },
      { src: "/images/gospodarii/deal-2.jpg", alt: "Pui în creștere la Vultureni" },
      { src: "/images/gospodarii/deal-3.jpg", alt: "Ioana și Mihai Pop" },
    ],
    veterinaryRegistration: "Înregistrare sanitar-veterinară: în curs de publicare",
  },
  {
    slug: "gospodaria-rusu",
    name: "Gospodăria Rusu",
    owner: "Familia Rusu",
    village: "Ciurila",
    county: "Cluj",
    coordinates: { lat: 46.665, lng: 23.546 },
    since: 2026,
    capacityPerLot: 180,
    shortDescription:
      "Gospodărie mică și atentă la detalii, cu livadă în care puii petrec mare parte din zi.",
    description:
      "Gospodăria Rusu lucrează cu loturi mici, ceea ce permite o atenție deosebită pentru fiecare pasăre. Puii au acces la livada de pruni din spatele casei, iar hrana este completată cu verdețuri. Este gospodăria potrivită pentru cei care vor să vadă cum arată creșterea „ca la bunici”, dar cu evidență modernă.",
    practices: [
      "Loturi mici, maximum 180 de pui",
      "Acces la livadă și verdețuri",
      "Furaje din cereale, fără făinuri de origine animală",
      "Program de vizite pentru clienți (la cerere)",
    ],
    photos: [
      { src: "/images/gospodarii/rusu-1.jpg", alt: "Pui în livada Gospodăriei Rusu" },
      { src: "/images/gospodarii/rusu-2.jpg", alt: "Curtea Gospodăriei Rusu din Ciurila" },
      { src: "/images/gospodarii/rusu-3.jpg", alt: "Hrănirea puilor" },
    ],
    veterinaryRegistration: "Înregistrare sanitar-veterinară: în curs de publicare",
  },
];
