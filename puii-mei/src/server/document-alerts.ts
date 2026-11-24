import "server-only";
import type { FarmDocument } from "@/lib/domain";
import { dueReminders, reminderText } from "@/lib/document-expiry";
import { site } from "@/lib/site";
import { store } from "./db/store";
import { notifyAdmins, notifyFarm } from "./notifications";
import { documentRepository } from "./repositories/documents";
import { farmRepository } from "./repositories/catalog";
import { userRepository } from "./repositories/users";
import { sendSms, smsEnabled } from "./sms";

/**
 * Alertele de expirare a documentelor (decizia PO 23.11.2026: compania anunță gospodarul din timp; CLAUDE-04 F-02).
 * Rulează zilnic (Vercel Cron → /api/cron/alerte-documente) sau din Admin → Documente. Fiecare alertă (document +
 * data expirării + prag) se „rezervă” atomic în colecția `doc-reminders` înainte de trimitere: se trimite o singură
 * dată, chiar dacă jobul rulează de mai multe ori sau în paralel.
 */
const SENT = "doc-reminders";
type SentReminder = { id: string; sentAt?: string; docId?: string; farmSlug?: string; threshold?: number; days?: number };

export async function sendDocumentReminders(now = new Date()) {
  const docs = (await documentRepository.list()).filter((d): d is FarmDocument & { farmSlug: string } => Boolean(d.farmSlug && d.expiresOn));
  const due = dueReminders(docs, now);
  const [farms, users] = await Promise.all([farmRepository.listAll(), userRepository.list()]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  let sent = 0;
  for (const r of due) {
    const claimed = await store.transact<SentReminder, boolean>(
      SENT,
      r.key,
      (cur) =>
        cur?.sentAt
          ? { result: false }
          : { patch: { sentAt: now.toISOString(), docId: r.doc.id, farmSlug: r.doc.farmSlug, threshold: r.threshold, days: r.days }, result: true },
      { id: r.key },
    );
    if (!claimed) continue;
    const farm = r.doc.farmSlug!;
    const text = reminderText(r.doc.title, r.days);
    await notifyFarm(farm, r.days < 0 ? "Document expirat" : "Document care expiră", `${text}\n${site.url}/cont/gospodar/documente#documente`);
    if (r.threshold <= 30 && smsEnabled()) {
      const phones = users.filter((u) => u.role === "gospodar" && u.farmSlug === farm && u.status === "activ" && u.phone).map((u) => u.phone);
      await Promise.all(phones.map((p) => sendSms(p, `Puii mei: ${text}`)));
    }
    if (r.threshold <= 30) {
      const call = r.threshold === 7 || r.threshold === 0 ? "SUNĂ gospodarul și ajută-l să obțină documentul nou. " : "";
      await notifyAdmins(`Document care expiră: ${farmName.get(farm) ?? farm}`, `${call}${text}\n${site.url}/cont/gospodar/documente?gospodarie=${farm}#documente`);
    }
    sent++;
  }
  return { due: due.length, sent };
}
