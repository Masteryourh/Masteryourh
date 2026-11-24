/**
 * Alertele de expirare a documentelor gospodăriei (decizia PO, 23.11.2026: compania anunță gospodarul din timp;
 * CLAUDE-04 F-02). Funcții pure, testate unitar; trimiterea e în `src/server/document-alerts.ts`.
 */
export type ExpiringDoc = { id: string; farmSlug?: string; category: string; title: string; expiresOn?: string; uploadedAt: string };

/** Pragurile alertelor (zile înainte de expirare); 0 = în ziua expirării sau după. [PROPUS: 60 / 30 / 14 / 7] */
export const REMINDER_DAYS = [60, 30, 14, 7, 0] as const;
export type ReminderThreshold = (typeof REMINDER_DAYS)[number];

const DAY = 86_400_000;
const utc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/** Zile întregi până la expirare (negativ = expirat), după data calendaristică din România. */
export function daysUntil(expiresOn: string, now: Date) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(now);
  return Math.round((utc(expiresOn) - utc(today)) / DAY);
}

/** Un document e înlocuit dacă gospodăria a încărcat după el un document de același tip care expiră mai târziu (sau nu expiră). */
export function isReplaced(doc: ExpiringDoc, all: ExpiringDoc[]) {
  return all.some(
    (o) =>
      o.id !== doc.id &&
      o.farmSlug === doc.farmSlug &&
      o.category === doc.category &&
      o.uploadedAt > doc.uploadedAt &&
      (!o.expiresOn || (doc.expiresOn !== undefined && o.expiresOn > doc.expiresOn)),
  );
}

/** Pragul curent: cel mai mic prag atins. Dacă jobul a lipsit câteva zile, se trimite doar alerta curentă, nu toate cele ratate. */
export function currentThreshold(days: number): ReminderThreshold | null {
  let t: ReminderThreshold | null = null;
  for (const x of REMINDER_DAYS) if (days <= x) t = x;
  return t;
}

/** Documentele active (neînlocuite) care expiră în `horizon` zile sau au expirat, cele mai urgente primele. */
export function expiringDocuments<T extends ExpiringDoc>(docs: T[], now: Date, horizon = 60) {
  return docs
    .filter((d) => d.expiresOn && !isReplaced(d, docs))
    .map((d) => ({ doc: d, days: daysUntil(d.expiresOn!, now) }))
    .filter((x) => x.days <= horizon)
    .sort((a, b) => a.days - b.days);
}

/** Alertele de trimis acum, fiecare cu o cheie unică (document + data expirării + prag) pentru trimitere o singură dată. */
export function dueReminders<T extends ExpiringDoc>(docs: T[], now: Date) {
  return expiringDocuments(docs, now).flatMap(({ doc, days }) => {
    const threshold = currentThreshold(days);
    return threshold === null ? [] : [{ doc, days, threshold, key: `${doc.id}:${doc.expiresOn}:${threshold}` }];
  });
}

/** „o zi”, „7 zile”, „30 de zile” (în română, de la 20 în sus se spune „de”). */
export function zile(n: number) {
  if (n === 1) return "o zi";
  return `${n}${n % 100 >= 20 || n % 100 === 0 ? " de" : ""} zile`;
}

/** Textul alertei, pe înțelesul gospodarului. */
export function reminderText(title: string, days: number) {
  if (days < 0) return `Documentul „${title}” a expirat de ${zile(-days)}. Încarcă documentul nou în panou.`;
  if (days === 0) return `Documentul „${title}” expiră azi. Încarcă documentul nou în panou.`;
  return `Documentul „${title}” expiră în ${zile(days)}. Încarcă documentul nou în panou, din timp.`;
}
