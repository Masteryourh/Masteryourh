import type { Farm } from "@/lib/domain";

/**
 * Gospodării partenere – date demonstrative pentru faza pilot (Bucovina de munte, județul Suceava).
 * Se vor muta în baza de date și vor fi administrate din panoul de administrare.
 */
export const farms: Farm[] = [
  {
    slug: "gospodaria-muresan",
    name: "Gospodăria Mureșan",
    owner: "Familia Mureșan",
    village: "Vama",
    county: "Suceava",
    coordinates: { lat: 47.567, lng: 25.683 },
    since: 2026,
    capacityPerLot: 250,
    shortDescription:
      "Gospodărie de familie pe un versant din Vama, cu adăpost nou și padoc înierbat de 1.200 m².",
    description:
      "Familia Mureșan crește păsări de trei generații, pe un versant însorit din Vama, în valea Moldovei. În parteneriat cu Puii mei, a amenajat un adăpost nou, ventilat natural, cu acces zilnic la un padoc înierbat. Puii cresc în aer curat de munte și sunt hrăniți cu furaje din cereale, completate cu porumb în etapa de finisare.",
    practices: [
      "Acces zilnic la padoc înierbat",
      "Furaje fără antibiotice ca promotori de creștere",
      "Densitate redusă în adăpost",
      "Jurnal zilnic de creștere: greutate, hrană, apă",
    ],
    photos: [
      { src: "/images/gospodarii/muresan-1.jpg", alt: "Pui în padocul Gospodăriei Mureșan" },
      { src: "/images/gospodarii/muresan-2.jpg", alt: "Adăpostul pentru pui din Vama" },
      { src: "/images/gospodarii/muresan-3.jpg", alt: "Familia Mureșan în gospodărie" },
    ],
    veterinaryRegistration: "Înregistrare sanitar-veterinară: în curs de publicare",
  },
  {
    slug: "ferma-de-la-deal",
    name: "Ferma de la Deal",
    owner: "Ioana și Mihai Pop",
    village: "Fundu Moldovei",
    county: "Suceava",
    coordinates: { lat: 47.533, lng: 25.4 },
    since: 2026,
    capacityPerLot: 300,
    shortDescription:
      "Doi tineri întorși în satul de munte al bunicilor, care au transformat vechiul grajd într-un adăpost modern pentru păsări.",
    description:
      "Ioana și Mihai s-au întors la Fundu Moldovei, în satul bunicilor, și au ales să crească păsări după reguli clare, cu evidență completă. Adăpostul are iluminare naturală, așternut de paie schimbat regulat și un sistem de adăpare automat. Fiecare lot este monitorizat zilnic și raportat în platforma Puii mei.",
    practices: [
      "Iluminare naturală și așternut de paie",
      "Adăpare automată cu apă de izvor analizată",
      "Monitorizare zilnică raportată în platformă",
      "Vizite periodice ale medicului veterinar",
    ],
    photos: [
      { src: "/images/gospodarii/deal-1.jpg", alt: "Adăpostul Fermei de la Deal" },
      { src: "/images/gospodarii/deal-2.jpg", alt: "Pui în creștere la Fundu Moldovei" },
      { src: "/images/gospodarii/deal-3.jpg", alt: "Ioana și Mihai Pop" },
    ],
    veterinaryRegistration: "Înregistrare sanitar-veterinară: în curs de publicare",
  },
  {
    slug: "gospodaria-rusu",
    name: "Gospodăria Rusu",
    owner: "Familia Rusu",
    village: "Vatra Moldoviței",
    county: "Suceava",
    coordinates: { lat: 47.65, lng: 25.567 },
    since: 2026,
    capacityPerLot: 180,
    shortDescription:
      "Gospodărie mică și atentă la detalii, la marginea pădurii, cu o pajiște în care puii petrec mare parte din zi.",
    description:
      "Gospodăria Rusu, din Vatra Moldoviței, lucrează cu loturi mici, ceea ce permite o atenție deosebită pentru fiecare pasăre. Puii au acces la pajiștea din spatele casei, la marginea pădurii, iar hrana este completată cu verdețuri. Este gospodăria potrivită pentru cei care vor să vadă cum arată creșterea „ca la bunici” în Bucovina, dar cu evidență modernă.",
    practices: [
      "Loturi mici, maximum 180 de pui",
      "Acces la pajiște și verdețuri",
      "Furaje din cereale, fără făinuri de origine animală",
      "Program de vizite pentru clienți (la cerere)",
    ],
    photos: [
      { src: "/images/gospodarii/rusu-1.jpg", alt: "Pui pe pajiștea Gospodăriei Rusu" },
      { src: "/images/gospodarii/rusu-2.jpg", alt: "Curtea Gospodăriei Rusu din Vatra Moldoviței" },
      { src: "/images/gospodarii/rusu-3.jpg", alt: "Hrănirea puilor" },
    ],
    veterinaryRegistration: "Înregistrare sanitar-veterinară: în curs de publicare",
  },
];
