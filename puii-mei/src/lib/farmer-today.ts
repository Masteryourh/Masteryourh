import type { TodayItem } from "./today";

/** Ce știe pagina gospodarului despre ziua de azi (date deja citite; funcția doar le transformă în listă). */
export interface FarmerDay {
  /** „/cont/gospodar”; `q` = „?gospodarie=…” când adminul previzualizează, altfel „”. */
  base: string;
  q: string;
  /** AAAA-LL-ZZ */
  today: string;
  /** Alertele de monitorizare (țarc nemutat, poza săptămânii lipsă). */
  growthAlerts: { id: string; kind: string; text: string }[];
  /** Loturile în creștere și ziua lor. */
  growing: { code: string; day: number; days: number }[];
  /** Notările din jurnal (lot + ziua la care se referă). */
  entries: { lotCode: string; date: string }[];
  /** Documente care expiră (zile < 0 = expirat). */
  expiring: { id: string; title: string; days: number }[];
  /** Loturi propuse, încă neaprobate de echipă. */
  pendingLots: string[];
  /** Comenzi pe loturile gospodăriei fără avans primit. */
  advancesDue: number;
  /** Există contul bancar pentru avans? */
  hasPayment: boolean;
  /** Comenzi pe loturile gospodăriei (active). */
  orders: number;
  tours: { id: string; code: string; date: string; status: string; parcels: number }[];
  /** Colete gata, încă neprinse într-o tură. */
  readyParcels: number;
}

const zile = (n: number) => (n === 1 ? "o zi" : `${n}${n % 100 >= 20 || n % 100 === 0 ? " de" : ""} zile`);

/** „De făcut azi” pentru gospodar: întâi ce nu suferă amânare, apoi ce așteaptă o acțiune, apoi informările. */
export function farmerToday(d: FarmerDay): TodayItem[] {
  const out: TodayItem[] = [];
  const link = (path: string, hash = "") => `${d.base}${path}${d.q}${hash}`;

  for (const a of d.growthAlerts) {
    out.push({ id: a.id, kind: "crestere", severity: "urgent", title: a.kind === "poza" ? "Poza săptămânii" : "Mută țarcul pe pășune", detail: a.text, href: link("/jurnal"), action: "Notează în jurnal" });
  }
  // Livrările de azi: doar turele cu colete; mai multe ture în aceeași zi = un singur element (spre lista turelor).
  const toursToday = d.tours.filter((t) => t.date === d.today && t.parcels > 0 && (t.status === "planificata" || t.status === "in-curs"));
  const colete = (n: number) => (n === 1 ? "un colet" : `${n}${n % 100 >= 20 || n % 100 === 0 ? " de" : ""} colete`);
  if (toursToday.length === 1) {
    const [t] = toursToday;
    out.push({ id: `tura-${t.id}`, kind: "tura", severity: "urgent", title: `Livrare azi · tura ${t.code}`, detail: `${colete(t.parcels)} de predat curierului.`, href: link(`/ture/${t.id}`), action: "Deschide tura" });
  } else if (toursToday.length > 1) {
    const n = toursToday.reduce((s, t) => s + t.parcels, 0);
    out.push({ id: "ture-azi", kind: "tura", severity: "urgent", title: `Livrări azi · ${toursToday.length} ture`, detail: `${colete(n)} de predat curierilor.`, href: link("", "#ture"), action: "Vezi turele" });
  }
  for (const e of d.expiring.filter((e) => e.days <= 7)) {
    out.push({ id: `doc-${e.id}`, kind: "document", severity: e.days < 0 ? "urgent" : "atentie", title: e.days < 0 ? `A expirat: ${e.title}` : `Expiră curând: ${e.title}`, detail: e.days < 0 ? `Expirat de ${zile(-e.days)}. Încarcă documentul nou.` : e.days === 0 ? "Expiră azi." : `Mai are ${zile(e.days)}.`, href: link("/documente", "#documente"), action: "Încarcă" });
  }
  const logged = new Set(d.entries.filter((e) => e.date === d.today).map((e) => e.lotCode));
  for (const g of d.growing.filter((g) => !logged.has(g.code))) {
    out.push({ id: `jurnal-${g.code}`, kind: "jurnal", severity: "atentie", title: `Jurnalul zilei · lotul ${g.code}`, detail: `Ziua ${g.day} din ${g.days}. Notează hrănirea, apa și eventualele pierderi.`, href: link("/jurnal"), action: "Notează" });
  }
  if (d.orders > 0 && !d.hasPayment) {
    out.push({ id: "cont", kind: "cont", severity: "atentie", title: "Adaugă contul pentru avans", detail: "Clienții plătesc avansul (pui de o zi + furaj) direct în contul tău.", href: link("", "#plata-hrana"), action: "Adaugă contul" });
  } else if (d.advancesDue > 0) {
    out.push({ id: "avansuri", kind: "avans", severity: "atentie", title: `${d.advancesDue} ${d.advancesDue === 1 ? "avans" : "avansuri"} de confirmat`, detail: "Bifează avansurile primite în cont.", href: link("", "#plata-hrana"), action: "Verifică" });
  }
  if (d.readyParcels > 0) {
    out.push({ id: "colete", kind: "colete", severity: "info", title: `${d.readyParcels} ${d.readyParcels === 1 ? "colet gata" : "colete gata"} de livrare`, detail: "Fă o tură de livrare ca să plece la clienți.", href: link("", "#ture"), action: "Fă tura" });
  }
  for (const code of d.pendingLots) {
    out.push({ id: `lot-${code}`, kind: "lot", severity: "info", title: `Lotul ${code} așteaptă aprobarea`, detail: "Echipa Puii mei verifică lotul; primești mesaj când e aprobat.", href: link("", "#loturi"), action: "Vezi lotul" });
  }
  const rank = { urgent: 0, atentie: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
