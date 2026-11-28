import type { TodayItem } from "./today";

/**
 * Rezumatul de dimineață pentru gospodar („De făcut azi”, trimis o dată pe zi). Funcții pure și deterministe:
 * aceleași date ⇒ același mesaj, aceeași cheie. Trimiterea reală NU e activată (mandat #62, 28.11.2026):
 * canalul și ora sunt configurabile, dar `enabled` e fals implicit, iar serverul folosește doar un adaptor de probă.
 */
export type DigestChannel = "sms" | "email";
export interface DigestConfig {
  enabled: boolean;
  channel: DigestChannel;
  /** Ora locală (0–23) de la care se poate trimite. */
  hour: number;
  /** Fusul orar implicit (gospodăriile din România). */
  timeZone: string;
}
export const DEFAULT_DIGEST: DigestConfig = { enabled: false, channel: "sms", hour: 7, timeZone: "Europe/Bucharest" };

/** Data locală AAAA-LL-ZZ în fusul dat (nu UTC: la 01:30 în România e deja ziua următoare). */
export function localDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function localHour(now: Date, timeZone: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
}

/** Cheia de deduplicare: o gospodărie, o zi locală, un canal ⇒ cel mult un mesaj. */
export const digestKey = (farmSlug: string, day: string, channel: DigestChannel) => `digest:${channel}:${farmSlug}:${day}`;

const MAX_LINES = 5;
const SMS_MAX = 306; // două segmente GSM-7; textul e fără diacritice ca să nu treacă pe UCS-2 (70 de caractere / segment)
const plain = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[„”]/g, '"');

export interface DigestMessage {
  key: string;
  farmSlug: string;
  channel: DigestChannel;
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Textul mesajului: urgentele primele (ordinea vine din `farmerToday`), cel mult 5 rânduri, apoi „și încă N”. */
export function buildDigest(input: { farmName: string; items: TodayItem[]; link: string }) {
  const shown = input.items.slice(0, MAX_LINES);
  const more = input.items.length - shown.length;
  const urgent = input.items.filter((i) => i.severity === "urgent").length;
  const subject = `Puii mei · ${input.farmName}: ${input.items.length} ${input.items.length === 1 ? "lucru" : "lucruri"} de făcut azi${urgent ? ` (${urgent} urgente)` : ""}`;
  const lines = shown.map((i) => `${i.severity === "urgent" ? "!" : "-"} ${i.title}`);
  if (more > 0) lines.push(`și încă ${more}`);
  let sms = plain(`Puii mei azi: ${lines.join("; ")}. Detalii: ${input.link}`);
  if (sms.length > SMS_MAX) sms = `${sms.slice(0, SMS_MAX - input.link.length - 4).trimEnd()}… ${input.link}`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = `<p>Bună dimineața! Iată ce e de făcut azi în ${esc(input.farmName)}:</p><ul>${shown
    .map((i) => `<li><strong>${esc(i.title)}</strong> – ${esc(i.detail)}</li>`)
    .join("")}${more > 0 ? `<li>și încă ${more}</li>` : ""}</ul><p><a href="${esc(input.link)}">Deschide panoul</a></p>`;
  const text = `Bună dimineața! Iată ce e de făcut azi în ${input.farmName}:\n${shown.map((i) => `- ${i.title}: ${i.detail}`).join("\n")}${more > 0 ? `\n- și încă ${more}` : ""}\n\n${input.link}`;
  return { subject, sms, text, html };
}

export interface DigestFarm {
  slug: string;
  name: string;
  phone?: string;
  email?: string;
  items: TodayItem[];
  /** Fusul gospodăriei, dacă diferă de cel implicit. */
  timeZone?: string;
}

export type DigestSkip = { farmSlug: string; reason: "dezactivat" | "prea-devreme" | "deja-trimis" | "nimic-de-facut" | "fara-contact" };

/**
 * Ce rezumate s-ar trimite acum. Determinist: depinde doar de argumente. `sent` = cheile deja puse în outbox
 * (deduplicarea pe gospodărie / zi locală / canal, inclusiv la rulări repetate sau simultane ale cron-ului).
 */
export function planDigests(farms: DigestFarm[], now: Date, sent: ReadonlySet<string>, config: DigestConfig, baseUrl: string) {
  const messages: DigestMessage[] = [];
  const skips: DigestSkip[] = [];
  for (const f of [...farms].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const tz = f.timeZone ?? config.timeZone;
    const key = digestKey(f.slug, localDate(now, tz), config.channel);
    const to = config.channel === "sms" ? f.phone : f.email;
    const skip = (reason: DigestSkip["reason"]) => skips.push({ farmSlug: f.slug, reason });
    if (!config.enabled) skip("dezactivat");
    else if (localHour(now, tz) < config.hour) skip("prea-devreme");
    else if (sent.has(key)) skip("deja-trimis");
    else if (f.items.length === 0) skip("nimic-de-facut");
    else if (!to) skip("fara-contact");
    else {
      const d = buildDigest({ farmName: f.name, items: f.items, link: `${baseUrl}/cont/gospodar` });
      messages.push({ key, farmSlug: f.slug, channel: config.channel, to, subject: d.subject, text: config.channel === "sms" ? d.sms : d.text, html: d.html });
    }
  }
  return { messages, skips };
}
