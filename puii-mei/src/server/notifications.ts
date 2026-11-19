import "server-only";
import type { ContactMessage, Preorder } from "@/lib/domain";

/**
 * Punct unic pentru notificări (email / SMS). În prima versiune doar
 * jurnalizează evenimentele; aici se va conecta un furnizor de email
 * (ex. Resend, Postmark) sau SMS.
 */
export async function notifyNewPreorder(p: Preorder) {
  console.info(`[puii-mei] Precomandă nouă ${p.number}: ${p.birds} pui, zona ${p.zoneId}`);
}

export async function notifyNewContactMessage(m: ContactMessage) {
  console.info(`[puii-mei] Mesaj nou de contact de la ${m.name}: ${m.subject}`);
}
