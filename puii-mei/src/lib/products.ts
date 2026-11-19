/**
 * Produse: puii (disponibili acum) și produsele planificate pentru etapele
 * următoare. Disponibilitatea va depinde de regiune, în funcție de
 * gospodăriile partenere din fiecare zonă.
 */

/** Specii de păsări pe care le poate avea un lot. */
export type Species = "pui" | "curcani" | "rate" | "fazani";

export const speciesLabels: Record<Species, string> = {
  pui: "Pui",
  curcani: "Curcani",
  rate: "Rațe",
  fazani: "Fazani",
};

export type UpcomingProductId = "curcani" | "rate" | "fazani" | "legume-sera";

export const upcomingProducts: { id: UpcomingProductId; name: string; text: string }[] = [
  {
    id: "curcani",
    name: "Curcani",
    text: "Curcani crescuți fără grabă, potriviți pentru sărbători și mese în familie.",
  },
  {
    id: "rate",
    name: "Rațe",
    text: "Rațe din gospodării cu acces la apă și pășune, în zonele care au condiții.",
  },
  {
    id: "fazani",
    name: "Fazani",
    text: "Fazani crescuți în crescătorii autorizate, pentru cei care caută ceva deosebit.",
  },
  {
    id: "legume-sera",
    name: "Legume din seră",
    text: "Roșii, castraveți și verdețuri din serele gospodăriilor partenere.",
  },
];

export const upcomingProductLabels = Object.fromEntries(
  upcomingProducts.map((p) => [p.id, p.name]),
) as Record<UpcomingProductId, string>;
