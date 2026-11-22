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
  /** Lot închis manual pentru precomenzi (rămâne vizibil la trasabilitate). */
  closed?: boolean;
  /**
   * Aprobarea adminului pentru loturile propuse de gospodari. Lipsă = aprobat
   * (loturile demonstrative și cele create de admin). Până la aprobare, lotul nu e public.
   */
  approval?: { status: "asteapta" | "aprobat" | "respins"; by?: string; at?: string; reason?: string };
  /** Numărul de țarcuri ale lotului (40 de pui / țarc). Lipsă = totalBirds / 40, rotunjit în sus. */
  pens?: number;
  /** Pornirile țarcurilor (puii de o zi intrați în gospodărie), în ordine. */
  penStarts?: { n: number; date: string; at: string; by: string }[];
  /** Pentru loturile create din panou. */
  createdAt?: string;
  createdBy?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  localities: string;
  /** Cost livrare în lei; 0 = gratuit. */
  fee: number;
  deliveryDay: string;
  active: boolean;
  /** Centrul aproximativ al zonei (pentru hartă). */
  center?: GeoPoint;
}

export interface GeoPoint {
  lat: number;
  lng: number;
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
  /** Pinul pus de client pe hartă (livrare la adresă). */
  location?: GeoPoint;
  /** Repere pentru curier (ex. „poarta verde, după pod”). */
  addressNote?: string;
  /** Când a fost predată clientului. */
  deliveredAt?: string;
  /** Codul secret al linkului „Comanda mea” (/comanda/<cod>), fără cont. */
  trackingToken?: string;
  /** Avansul pentru hrană, plătit de client direct în contul gospodăriei. */
  feedPayment?: FeedPayment;
  /**
   * Alocarea automată: „alegere” = nu încape într-o singură gospodărie, clientul alege;
   * „asteapta” = clientul așteaptă o gospodărie pentru toată comanda; „impartita” = împărțită în părți.
   */
  allocation?: { status: "alocata" | "alegere" | "asteapta" | "impartita"; at: string; parts?: string[] };
  /** Pentru o parte dintr-o comandă împărțită: numărul comenzii inițiale. */
  parentNumber?: string;
}

export type FeedPaymentStatus = "de-platit" | "declarata" | "primita";

export interface FeedPayment {
  status: FeedPaymentStatus;
  /** Suma la momentul declarării plății de către client (lei). */
  amount?: number;
  declaredAt?: string;
  /** Confirmarea primirii, de gospodar sau admin. */
  confirmedAt?: string;
  confirmedBy?: string;
}

/** Datele de plată ale gospodăriei (contul în care clienții plătesc avansul pentru hrană). */
export interface FarmPaymentDetails {
  /** Slug-ul gospodăriei. */
  id: string;
  holder: string;
  iban: string;
  bank: string;
  /** Prețul furajului (lei / kg) folosit la calculul avansului. */
  feedPricePerKg: number;
  /** Prețul puiului de o zi (lei / pui), inclus în avans. */
  chickPricePerBird?: number;
  updatedAt: string;
  updatedBy: string;
}

/* ------------------------------------------------------------------ */
/* Livrări (etapa 2)                                                   */
/* ------------------------------------------------------------------ */

export interface CheckAnswers {
  birdsReceived: number;
  packagingOk: boolean;
  coldOk: boolean;
  appearanceOk: boolean;
  /** true = toate verificările sunt în regulă. */
  conditionOk: boolean;
  problem: string;
  /** id-urile celor 4 fotografii ale coletului. */
  photoIds: string[];
}

/**
 * Coletul unei precomenzi (eticheta generată de gospodar), cu două coduri QR:
 * „Curier” (courierToken) și „Client” (clientToken). Un colet pe precomandă.
 */
export interface Parcel {
  /** = id-ul precomenzii. */
  id: string;
  preorderNumber: string;
  farmSlug: string;
  lotCode: string | null;
  birds: number;
  /** Versiunea etichetei; regenerarea o crește și invalidează codurile vechi. */
  version: number;
  clientToken: string;
  courierToken: string;
  replacedTokens: { clientToken: string; courierToken: string; replacedAt: string }[];
  createdAt: string;
  createdBy: string;
  /** Data limită de consum, tipărită pe etichetă (YYYY-MM-DD). */
  expiresOn: string;
  tourId?: string;
  /** Încărcarea la ridicare (curierul scanează QR-ul „Curier”). */
  loaded?: { at: string; temp: number; photoIds: string[]; lat?: number; lng?: number };
  /** Predarea la client. */
  delivered?: {
    at: string;
    temp: number;
    tempPhotoId: string;
    signaturePhotoId: string;
    lat?: number;
    lng?: number;
    accuracy?: number;
  };
  /** Confirmarea primirii de către client. */
  confirmationDeadline?: string;
  submittedAt?: string;
  answers?: CheckAnswers;
  ratingToken?: string;
  ratingExpiresAt?: string;
  ratingSubmittedAt?: string;
  ratings?: { farm: number; courier: number; platform: number; comment: string };
}

export type TourStatus = "planificata" | "in-curs" | "incheiata" | "anulata";

export interface TourExtension {
  id: string;
  at: string;
  reason: string;
  description: string;
  photoId: string;
  lat?: number;
  lng?: number;
  status: "asteapta" | "aprobata" | "respinsa";
  hours?: number;
  decidedAt?: string;
  decidedBy?: string;
  comment?: string;
}

/** Tura de livrare: ridicarea din gospodărie și opririle la clienți, în ordine. */
export interface Tour {
  id: string;
  code: string;
  farmSlug: string;
  date: string;
  createdBy: string;
  createdAt: string;
  status: TourStatus;
  /** Ordinea opririlor (id-uri de colete). */
  parcelIds: string[];
  /** Câte ore are curierul de la ridicare până la ultima livrare. */
  durationHours: number;
  /** Linkul turei pentru curier (fără cont). */
  token: string;
  /** PIN-ul de ridicare, afișat în contul gospodarului. Se folosește o singură dată. */
  pickupPin: string;
  pickupPinUsed?: boolean;
  deadlineAt?: string;
  startedAt?: string;
  finishedAt?: string;
  courier?: {
    name: string;
    phone: string;
    plate: string;
    vehicleType: string;
    atp: string;
    pairedAt: string;
    pairedBy: "pin" | "confirmare";
    personalPinHash?: string;
    /** Crește la resetarea accesului: invalidează sesiunile vechi ale curierului. */
    sessionVersion: number;
  };
  /** Cererea curierului către gospodar (când nu are PIN-ul de ridicare). */
  pinRequest?: {
    id: string;
    at: string;
    status: "asteapta" | "aprobata" | "respinsa";
    name: string;
    phone: string;
    plate: string;
    vehicleType: string;
    atp: string;
  };
  failedPins: number;
  locked: boolean;
  start?: {
    at: string;
    odometer: number;
    odometerPhotoId: string;
    platePhotoId: string;
    compartmentTemp: number;
    tempPhotoId: string;
    hygieneOk: boolean;
    lat?: number;
    lng?: number;
  };
  finish?: { at: string; odometer: number; odometerPhotoId: string; note: string };
  extensions: TourExtension[];
}

/** Intrare în jurnalul nemodificabil al turei. */
export interface TourEvent {
  id: string;
  tourId: string;
  at: string;
  type: string;
  actor: string;
  message: string;
  lat?: number;
  lng?: number;
  alert?: boolean;
}

/** Fotografie (JPEG/PNG comprimat), stocată ca base64. */
export interface StoredPhoto {
  id: string;
  mime: string;
  data: string;
  at: string;
  /** Contextul: „parcel:<id>”, „tour:<id>” etc. – pentru controlul accesului. */
  owner: string;
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

export type UserRole = "admin" | "gospodar" | "investitor";
export type UserStatus = "invitat" | "activ" | "dezactivat";

/** Cont de utilizator al platformei (curierii nu au cont: primesc acces temporar pe tură). */
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  /** Pentru gospodari: gospodăria administrată. */
  farmSlug?: string;
  status: UserStatus;
  passwordHash?: string;
  /** Crește la schimbarea parolei / dezactivare: invalidează sesiunile vechi. */
  sessionVersion: number;
  /** Link de invitație sau de resetare a parolei. */
  setupToken?: string;
  setupExpiresAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

/* ------------------------------------------------------------------ */
/* Documente, cheltuieli, investiții (etapele 3–4)                     */
/* ------------------------------------------------------------------ */

/** Fișier încărcat (stocat în baza de date; pentru volum mare se mută pe Vercel Blob). */
export interface StoredFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Amprenta SHA-256 a conținutului: dovada că fișierul nu a fost modificat. */
  sha256: string;
  data: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type DocumentCategory = "factura" | "aviz" | "contabil" | "dsv" | "contract" | "proprietate" | "altele";

/** Document justificativ (al unei gospodării sau al unei investiții). Nu se șterge; doar se verifică. */
export interface FarmDocument {
  id: string;
  /** Gospodăria la care se referă (lipsă pentru actele exclusiv ale unei investiții). */
  farmSlug?: string;
  lotCode?: string;
  /** Investiția la care e atașat (contracte, rapoarte). */
  investmentId?: string;
  category: DocumentCategory;
  title: string;
  /** Numărul documentului (factură, aviz etc.). */
  number?: string;
  /** Data documentului. */
  date: string;
  fileId: string;
  fileName: string;
  mime: string;
  size: number;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export type ExpenseCategory =
  | "pui" | "furaj" | "sanatate" | "energie" | "asternut" | "ambalaje" | "transport" | "manopera" | "taxe" | "altele"
  /* venituri */
  | "vanzare-carne" | "avans-hrana" | "alte-venituri";

/**
 * Înregistrare în registrul gospodăriei (cheltuială sau venit), fiscalizată: are mereu
 * numărul documentului fiscal și documentul atașat. Nu se modifică; o greșeală se anulează cu motiv.
 */
export interface Expense {
  id: string;
  /** Lipsă = cheltuială (înregistrările mai vechi). */
  kind?: "cheltuiala" | "venit";
  /** Numărul documentului fiscal: factură, bon fiscal, chitanță. */
  invoiceNumber?: string;
  farmSlug: string;
  lotCode?: string;
  date: string;
  category: ExpenseCategory;
  supplier: string;
  description: string;
  amount: number;
  documentId?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  /**
   * Confirmarea corectitudinii datelor (cere nr. document fiscal + documentul atașat).
   * Fără ea, înregistrarea e ciornă: se poate completa; după ea nu se mai modifică.
   */
  confirmedAt?: string;
  confirmedBy?: string;
  voided?: { at: string; by: string; reason: string };
}

export type InvestmentStatus = "propusa" | "semnata" | "activa" | "finalizata" | "anulata";

export interface InvestmentEvent {
  at: string;
  date: string;
  title: string;
  text: string;
  by: string;
}

/** Investiția unui investitor: obiect, sumă, gospodăria susținută, cronologie, acte. */
export interface Investment {
  id: string;
  investorId: string;
  title: string;
  description: string;
  amount: number;
  date: string;
  status: InvestmentStatus;
  farmSlug?: string;
  /** Randament / condiții, pe scurt (ex. „8% pe an, plătit trimestrial”). */
  terms: string;
  events: InvestmentEvent[];
  createdAt: string;
  createdBy: string;
}
