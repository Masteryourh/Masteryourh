/** Drumul puiului, de la comandă la masă: aceleași etape în hero (miniaturi) și în povestea animată. */
export interface JourneyStep {
  id: string;
  short: string;
  title: string;
  text: string;
  chips: string[];
  image: string;
  alt: string;
  /** Eticheta care „sare” peste imagine în povestea animată. */
  badge: string;
}

export const journey: JourneyStep[] = [
  {
    id: "comanda",
    short: "Comanzi",
    title: "Comanzi online",
    text: "Alegi câți pui vrei, lotul și unde îi primești. Durează două minute.",
    chips: ["Fără cont", "Fără plată pe site"],
    image: "/images/poveste/1-comanda.webp",
    alt: "O tânără plasează precomanda de pe telefon, pe un balcon cu vedere spre munți",
    badge: "2 minute",
  },
  {
    id: "hrana",
    short: "Avansul",
    title: "Plătești avansul, direct gospodăriei",
    text: "Avansul acoperă puii de o zi și furajul lor. Se scade din prețul total; la livrare plătești diferența.",
    chips: ["Pui de o zi + ~10 kg furaj", "Se scade din total"],
    image: "/images/poveste/2-hrana.webp",
    alt: "Mâinile unui gospodar torn porumb și grâu într-o hrănitoare de lemn",
    badge: "Pui + furaj",
  },
  {
    id: "puii",
    short: "Puii de o zi",
    title: "Sosesc puii de o zi",
    text: "Gospodăria primește exact câți pui s-au comandat. Lotul primește un cod pe care îl urmărești.",
    chips: ["Cod de lot", "Fără risipă"],
    image: "/images/poveste/3-pui.webp",
    alt: "Pui de o zi, galbeni și pufoși, sub o lampă caldă, pe paie",
    badge: "Lot MS-2026-01",
  },
  {
    id: "crestere",
    short: "Pe pășune",
    title: "Cresc pe pășune, fără grabă",
    text: "Primele 21 de zile la căldură, în interior; apoi pe pășune, în țarcuri de 40 de pui mutate zilnic pe iarbă proaspătă. Gata la 60 de zile.",
    chips: ["60 de zile", "Țarc mutat zilnic"],
    image: "/images/poveste/4-crestere.webp",
    alt: "O gospodină aruncă grăunțe găinilor albe pe o pajiște de munte",
    badge: "60 de zile",
  },
  {
    id: "pregatire",
    short: "Pregătire",
    title: "Pregătiți tradițional, în gospodărie",
    text: "Sacrificați acolo unde au crescut, curat și cu grijă, apoi răciți imediat.",
    chips: ["Același loc", "Lanț de frig"],
    image: "/images/poveste/5-pregatire.webp",
    alt: "Un gospodar împachetează puii proaspeți într-o ladă frigorifică, într-o bucătărie curată",
    badge: "0–4 °C",
  },
  {
    id: "livrare",
    short: "Livrare",
    title: "Livrați la ușa ta",
    text: "Curierul pleacă cu traseul gata făcut. Vezi când ajunge și verifici coletul cu fotografii.",
    chips: ["Urmărire live", "Confirmare cu poze"],
    image: "/images/poveste/6-livrare.webp",
    alt: "O dubă frigorifică albă pe un drum de munte, printre case de lemn",
    badge: "Ești oprirea 3",
  },
  {
    id: "masa",
    short: "La masă",
    title: "Pe masa ta",
    text: "Plătești carnea la livrare, după greutatea reală. Și știi exact de unde vine.",
    chips: ["Plată la livrare", "Trasabilitate completă"],
    image: "/images/poveste/7-masa.webp",
    alt: "O familie la cină, cu un pui rumenit în mijlocul mesei",
    badge: "Poftă bună!",
  },
];
