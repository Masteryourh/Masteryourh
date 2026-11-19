/**
 * Modelul de domeniu Puii mei.
 *
 * Tipurile de aici sunt sursa unică de adevăr pentru întreaga aplicație
 * (website public, viitorul panou de administrare, API). Ele oglindesc
 * schema din `prisma/schema.prisma`, pregătită pentru integrarea unei baze
 * de date relaționale.
 */

export type ISODate = string; // format YYYY-MM-DD

/** Gospodărie parteneră care crește puii la comandă. */
export interface Farm {
  slug: string;
  name: string;
  owner: string;
  village: string;
  county: string;
  /** Coordonate aproximative, pentru hartă (viitor). */
  coordinates?: { lat: number; lng: number };
  since: number;
  /** Capacitate maximă pe lot (număr de pui). */
  capacityPerLot: number;
  shortDescription: string;
  description: string;
  practices: string[];
  /** Căi relative din /public. Lipsa fișierului afișează un placeholder. */
  photos: { src: string; alt: string }[];
  veterinaryRegistration: string;
}

/** Etapele prin care trece un lot de producție. */
export type LotStageKey =
  | "precomenzi"
  | "pui-de-o-zi"
  | "crestere"
  | "finisare"
  | "procesare"
  | "livrare";

export interface LotStageDefinition {
  key: LotStageKey;
  label: string;
  description: string;
  /** Ziua (față de începutul creșterii) la care începe etapa. Poate fi negativă. */
  startDay: number;
}

export type LotStatus =
  | "precomenzi-deschise"
  | "in-crestere"
  | "in-procesare"
  | "disponibil"
  | "livrat";

/** Lot de producție – unitatea de bază a trasabilității. */
export interface Lot {
  code: string;
  farmSlug: string;
  /** Specia crescută în lot. Lipsă = „pui” (loturile existente). */
  species?: import("./products").Species;
  breed: string;
  /** Data la care puii de o zi intră în gospodărie. */
  startDate: ISODate;
  /** Durata totală a creșterii, în zile. */
  growthDays: number;
  totalBirds: number;
  /** Pui deja rezervați prin precomenzi (actualizat de admin). */
  reservedBirds: number;
  feed: string;
  processor: string;
  notes?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  localities: string;
  /** Cost livrare în lei; 0 = gratuit. */
  fee: number;
  deliveryDay: string;
  active: boolean;
}

export type PreorderStatus =
  | "noua"
  | "confirmata"
  | "alocata-lot"
  | "in-livrare"
  | "livrata"
  | "anulata";

export interface Preorder {
  id: string;
  number: string;
  createdAt: string;
  status: PreorderStatus;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  birds: number;
  /** Lotul preferat sau `null` pentru „primul disponibil”. */
  lotCode: string | null;
  zoneId: string;
  address: string;
  notes: string;
  estimate: PriceEstimate;
  marketingConsent: boolean;
}

export interface ContactMessage {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface PriceEstimate {
  birds: number;
  avgWeightKg: number;
  pricePerKg: number;
  estimatedKg: number;
  productValue: number;
  deliveryFee: number;
  total: number;
}

/** Gospodărie cu metadate de administrare (demo din cod sau creată din admin). */
export interface FarmRecord extends Farm {
  id: string;
  active: boolean;
  /** „demo” = definită în src/data/farms.ts; „admin” = creată din panoul de administrare. */
  source: "demo" | "admin";
  createdAt?: string;
  applicationId?: string;
}

export type DsvStatus = "inregistrat" | "in-curs" | "neinregistrat";

export type FarmApplicationStatus =
  | "noua"
  | "in-evaluare"
  | "vizita-programata"
  | "aprobata"
  | "respinsa";

/** Solicitare de parteneriat trimisă de o gospodărie nouă. */
export interface FarmApplication {
  id: string;
  createdAt: string;
  status: FarmApplicationStatus;
  name: string;
  phone: string;
  email: string;
  farmName: string;
  village: string;
  county: string;
  /** Câți pui poate crește pe lot (estimare). */
  capacity: number;
  experienceYears: number;
  hasShelter: boolean;
  hasOutdoorArea: boolean;
  /** Ce altceva ar putea produce gospodăria (etapele următoare). */
  canTurkeys?: boolean;
  canDucks?: boolean;
  canPheasants?: boolean;
  hasGreenhouse?: boolean;
  dsvStatus: DsvStatus;
  message: string;
  /** Note interne ale echipei Puii mei. */
  internalNote: string;
  /** Slug-ul gospodăriei create din această solicitare. */
  farmSlug?: string;
}

export type InvestmentRange = "sub-10k" | "10k-50k" | "50k-200k" | "peste-200k" | "nestabilit";

/** Solicitare de parteneriat trimisă de un investitor. */
export interface InvestorApplication {
  id: string;
  createdAt: string;
  status: FarmApplicationStatus;
  name: string;
  phone: string;
  email: string;
  investorType: "persoana-fizica" | "companie";
  company: string;
  interestLots: boolean;
  interestInfrastructure: boolean;
  interestExpansion: boolean;
  amountRange: InvestmentRange;
  region: string;
  message: string;
  internalNote: string;
}

/** Înscriere „Anunță-mă” pentru produsele din etapele următoare. */
export interface InterestSignup {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  county: string;
  products: import("./products").UpcomingProductId[];
}
