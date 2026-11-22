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

export type UpcomingProductId = "curcani" | "rate" | "fazani" | "legume-sera" | "borcane" | "afumaturi" | "pastravi" | "congelator";

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
  {
    id: "borcane",
    name: "Borcane din cămară",
    text: "Zacuscă, dulcețuri, zarzavaturi și murături făcute în gospodărie, după rețetele casei.",
  },
  {
    id: "afumaturi",
    name: "Afumături",
    text: "Slănină, cârnați și carne afumată la fum de lemn, ca la munte.",
  },
  {
    id: "pastravi",
    name: "Păstrăvi",
    text: "Păstrăvi din bazine cu apă rece de munte, de la păstrăvării din zonă.",
  },
  {
    id: "congelator",
    name: "Pachete pentru congelator",
    text: "Comenzi mari de pui, pentru familiile care vor rezervă pe câteva luni, cu livrare o dată.",
  },
];

export const upcomingProductLabels = Object.fromEntries(
  upcomingProducts.map((p) => [p.id, p.name]),
) as Record<UpcomingProductId, string>;
