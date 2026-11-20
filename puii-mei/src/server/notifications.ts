import "server-only";
import { sendEmail } from "./email";
import { site } from "@/lib/site";
import type { ContactMessage, FarmApplication, InvestorApplication, Preorder } from "@/lib/domain";

/**
 * Punct unic pentru notificări (email / SMS). În prima versiune doar
 * jurnalizează evenimentele; aici se va conecta un furnizor de email
 * (ex. Resend, Postmark) sau SMS.
 */
export async function notifyNewPreorder(p: Preorder) {
  console.info(`[puii-mei] Precomandă nouă ${p.number}: ${p.birds} pui, zona ${p.zoneId}`);
  if (!p.trackingToken) return;
  const link = `${site.url}/comanda/${p.trackingToken}`;
  await sendEmail({
    to: p.customer.email,
    subject: `Precomanda ${p.number} – Puii mei`,
    text: `Mulțumim, ${p.customer.name}! Precomanda ${p.number} (${p.birds} pui) a fost înregistrată.\n\nPe pagina comenzii găsești datele pentru plata avansului de hrană (direct în contul gospodăriei), evoluția lotului și livrarea:\n${link}\n\nPăstrează acest email.`,
    html: `<p>Mulțumim, ${escapeHtml(p.customer.name)}! Precomanda <strong>${p.number}</strong> (${p.birds} pui) a fost înregistrată.</p><p>Pe pagina comenzii găsești datele pentru plata avansului de hrană (direct în contul gospodăriei), evoluția lotului și livrarea:</p><p><a href="${link}">Comanda mea</a></p><p>Păstrează acest email.</p>`,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function notifyNewContactMessage(m: ContactMessage) {
  console.info(`[puii-mei] Mesaj nou de contact de la ${m.name}: ${m.subject}`);
}

export async function notifyNewFarmApplication(a: FarmApplication) {
  console.info(`[puii-mei] Solicitare parteneriat: ${a.name}, ${a.village} (${a.county}), ~${a.capacity} pui/lot`);
}

export async function notifyNewInvestorApplication(a: InvestorApplication) {
  console.info(`[puii-mei] Solicitare investitor: ${a.name}${a.company ? ` (${a.company})` : ""}, interval ${a.amountRange}`);
}
