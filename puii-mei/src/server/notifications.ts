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
  await notifyAdmins(`Precomandă nouă ${p.number}`, `${p.customer.name}, ${p.customer.phone}: ${p.birds} pui, lot ${p.lotCode ?? "primul disponibil"}.\n${site.url}/admin`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function notifyNewContactMessage(m: ContactMessage) {
  console.info(`[puii-mei] Mesaj nou de contact de la ${m.name}: ${m.subject}`);
  await notifyAdmins(`Mesaj nou: ${m.subject}`, `${m.name} (${m.email}${m.phone ? `, ${m.phone}` : ""}):\n\n${m.message}`);
}

export async function notifyNewFarmApplication(a: FarmApplication) {
  console.info(`[puii-mei] Solicitare parteneriat: ${a.name}, ${a.village} (${a.county}), ~${a.capacity} pui/lot`);
  await notifyAdmins(`Solicitare gospodărie: ${a.name}`, `${a.name}, ${a.village} (${a.county}), ~${a.capacity} pui/lot.\n${site.url}/admin/parteneri`);
}

export async function notifyNewInvestorApplication(a: InvestorApplication) {
  console.info(`[puii-mei] Solicitare investitor: ${a.name}${a.company ? ` (${a.company})` : ""}, interval ${a.amountRange}`);
  await notifyAdmins(`Solicitare investitor: ${a.name}`, `${a.name}${a.company ? ` (${a.company})` : ""}, interval ${a.amountRange}.\n${site.url}/admin/parteneri`);
}

/* ------------------------------------------------------------------ */
/* Evenimentele comenzii                                               */
/* ------------------------------------------------------------------ */

export type OrderEvent = "confirmata" | "alocata" | "plata-primita" | "livrare-programata" | "livrata" | "anulata";

const orderMessages: Record<OrderEvent, (p: Preorder, extra?: string) => { subject: string; body: string }> = {
  confirmata: (p) => ({ subject: `Precomanda ${p.number} a fost confirmată`, body: "Precomanda ta a fost confirmată. Pe pagina comenzii vezi pasul următor." }),
  alocata: (p) => ({
    subject: `Precomanda ${p.number}: datele pentru plata hranei`,
    body: `Comanda ta a fost alocată lotului ${p.lotCode}. Pe pagina comenzii găsești contul gospodăriei și suma pentru avansul de hrană.`,
  }),
  "plata-primita": (p) => ({ subject: `Plata hranei pentru ${p.number} a fost primită`, body: "Gospodăria a confirmat primirea avansului pentru hrană. Mulțumim!" }),
  "livrare-programata": (p, date) => ({
    subject: `Livrarea comenzii ${p.number} e programată`,
    body: `Livrarea e programată pe ${date ?? "data comunicată"}. Pe pagina comenzii poți urmări curierul.`,
  }),
  livrata: (p) => ({ subject: `Comanda ${p.number} a fost livrată`, body: "Confirmă primirea pe pagina comenzii și spune-ne cum a fost." }),
  anulata: (p) => ({ subject: `Precomanda ${p.number} a fost anulată`, body: "Precomanda a fost anulată. Dacă e o greșeală, scrie-ne." }),
};

/** Email către client la fiecare pas important al comenzii (dacă emailul e configurat). */
export async function notifyOrderEvent(p: Preorder, event: OrderEvent, extra?: string) {
  console.info(`[puii-mei] Comanda ${p.number}: ${event}`);
  const { subject, body } = orderMessages[event](p, extra);
  const link = p.trackingToken ? `${site.url}/comanda/${p.trackingToken}` : site.url;
  await sendEmail({
    to: p.customer.email,
    subject,
    text: `Bună, ${p.customer.name}!\n\n${body}\n\n${link}\n\nPuii mei`,
    html: `<p>Bună, ${escapeHtml(p.customer.name)}!</p><p>${escapeHtml(body)}</p><p><a href="${link}">Comanda mea</a></p><p>Puii mei</p>`,
  });
}

/** Email către gospodarii unei gospodării (conturile active legate de ea). */
export async function notifyFarm(farmSlug: string, subject: string, text: string) {
  const { userRepository } = await import("./repositories/users");
  const users = (await userRepository.list()).filter((u) => u.role === "gospodar" && u.farmSlug === farmSlug && u.status === "activ");
  console.info(`[puii-mei] Gospodăria ${farmSlug}: ${subject}`);
  await Promise.all(users.map((u) => sendEmail({ to: u.email, subject, text, html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>` })));
}

/** Email către administratori (ADMIN_NOTIFY_EMAIL sau ADMIN_USER). */
export async function notifyAdmins(subject: string, text: string) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_USER || "";
  if (!to.includes("@")) return;
  await sendEmail({ to, subject: `[Puii mei] ${subject}`, text, html: `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>` });
}
