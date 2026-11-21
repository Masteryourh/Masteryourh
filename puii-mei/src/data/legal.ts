import type { LegalEntry } from "@/lib/legal";

/** Sursele găsite la cercetarea limitelor de sacrificare în gospodărie (noiembrie 2026). De verificat. */
export const legalSeed: Omit<LegalEntry, "createdAt" | "createdBy">[] = [
  {
    id: "ordin-ansvsa-6-2024",
    kind: "lege",
    title: "Ordinul ANSVSA nr. 6/2024 – vânzarea directă",
    url: "https://legislatie.just.ro/Public/DetaliiDocumentAfis/278265",
    summary:
      "Carnea de pasăre obținută prin sacrificare la fermă poate fi vândută direct dacă provine de la cel mult 10.000 de capete pe an. Baza limitei anuale din platformă. De verificat textul final și condițiile (înregistrare DSVSA, zona de vânzare).",
    date: "2024-01-10",
    verified: false,
  },
  {
    id: "ordin-ansvsa-111-2008",
    kind: "lege",
    title: "Ordinul ANSVSA nr. 111/2008 – înregistrarea sanitar-veterinară (vânzare directă)",
    url: "https://lege5.ro/gratuit/geytonjzha/norma-sanitara-veterinara-si-pentru-siguranta-alimentelor-privind-procedura-de-inregistrare-sanitara-veterinara-si-pentru-siguranta-alimentelor-a-activitatilor-de-obtinere-si-de-vanzare-directa-si-sau",
    summary:
      "Norma de înregistrare sanitar-veterinară pentru vânzarea directă a produselor primare. Versiunile mai vechi limitau carnea de pasăre obținută în fermă la 2.000 de capete pe an.",
    date: "2008-12-16",
    verified: false,
  },
  {
    id: "ordin-111-2008-actualizat",
    kind: "lege",
    title: "Ordinul 111/2008 – text actualizat (e-guvernare)",
    url: "https://edirect.e-guvernare.ro/Uploads/Legi/8270/ORDIN%20nr.%20111%202008%20actualizat%2030.09.2019.pdf",
    summary: "Text consolidat la 30.09.2019. Limita de 500 kg/lună se referă la livrările între unități de vânzare cu amănuntul.",
    date: "2019-09-30",
    verified: false,
  },
  {
    id: "regulament-ue-853-2004",
    kind: "lege",
    title: "Regulamentul (CE) nr. 853/2004 – derogarea pentru cantități mici",
    url: "https://industriacarnii.ro/Articol-ANSVSA:-Derogare-pentru-micii-crescatori-pentru-a-vinde-carne/8177",
    summary: "Permite statelor membre derogări pentru furnizarea directă de cantități mici de carne de pasăre de la producători cu cel mult 10.000 de păsări pe an.",
    verified: false,
  },
  {
    id: "ansvsa-centre-sacrificare",
    kind: "ghid",
    title: "ANSVSA – centrele de sacrificare pentru păsări și iepuri din ferme",
    url: "https://www.ansvsa.ro/blog/centrele-de-sacrificare-pentru-pasari-si-iepuri-de-la-nivelul-fermelor-inregistrate-sanitar-veterinar-vor-putea-sa-isi-desfasoare-activitatea-si-dupa-data-de-31-decembrie-2020/",
    summary: "Centrele de sacrificare de la nivelul fermelor înregistrate sanitar-veterinar își pot continua activitatea; carnea se poate vinde direct consumatorului final.",
    verified: false,
  },
  {
    id: "adevarul-ansvsa-limite",
    kind: "stire",
    title: "Adevărul: ANSVSA limitează cantitățile vândute direct de ferme",
    url: "https://adevarul.ro/economie/ansvsa-limiteaza-cantitatile-de-produse-ce-pot-fi-2325725.html",
    summary: "Articol despre proiectul de ordin privind limitele vânzării directe (decembrie 2023).",
    date: "2023-12-01",
    verified: false,
  },
  {
    id: "agrointel-limite",
    kind: "stire",
    title: "Agrointel: limitele ANSVSA pentru vânzarea directă din ferme",
    url: "https://agrointel.ro/281463/limite-ansvsa-vanzare-directa-ferme",
    summary: "Prezentarea limitelor propuse pentru micii fermieri.",
    verified: false,
  },
  {
    id: "alba24-limite",
    kind: "stire",
    title: "Alba24: ANSVSA impune limite pentru micii fermieri",
    url: "https://alba24.ro/ansvsa-impune-limite-pentru-micii-fermieri-vanzare-directa-de-maximum-300-litri-de-lapte-pe-zi-sau-oua-de-la-cel-mult-50-de-gaini-1012668.html",
    summary: "Exemple de limite: lapte, ouă, carne de pasăre.",
    verified: false,
  },
];
