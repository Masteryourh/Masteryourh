import "server-only";
import { headers } from "next/headers";
import { CONFIRMATION_WINDOW_HOURS, RATING_WINDOW_DAYS } from "@/lib/confirmation";
import type { DeliveryConfirmation } from "@/lib/domain";
import { preorderRepository } from "@/server/repositories/preorders";
import { confirmationRepository, newToken } from "@/server/repositories/confirmations";
import { lotRepository } from "@/server/repositories/catalog";
import { sendEmail } from "@/server/email";

/** Adresa site-ului din cererea curentă (pentru linkurile trimise clienților). */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.puiimei.ro";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const clientUrl = (origin: string, c: DeliveryConfirmation) => `${origin}/confirmare/${c.token}`;
export const courierUrl = (origin: string, c: DeliveryConfirmation) => `${origin}/curier/livrare/${c.courierToken}`;
export const ratingUrl = (origin: string, c: DeliveryConfirmation) => `${origin}/evaluare/${c.ratingToken}`;

/** Codurile pentru eticheta coletului (create o singură dată pe precomandă). */
export async function ensureLabel(preorderId: string) {
  const preorder = await preorderRepository.byId(preorderId);
  if (!preorder) return null;
  const lot = preorder.lotCode ? await lotRepository.byCode(preorder.lotCode) : null;
  const confirmation = await confirmationRepository.ensureFor(preorder, lot?.farmSlug ?? null);
  return { preorder, confirmation };
}

/**
 * Bifa „Livrat” (curierul, după scanarea QR-ului de pe colet, sau adminul):
 * pornește termenul de confirmare și trimite clientului linkul și pe email.
 */
export async function markDelivered(preorderId: string, by: "curier" | "admin") {
  const label = await ensureLabel(preorderId);
  if (!label) throw new Error("Precomanda nu există");
  const { preorder, confirmation } = label;
  if (confirmation.deliveredAt) return confirmation;

  const now = new Date();
  const patch: Partial<DeliveryConfirmation> = {
    deliveredAt: now.toISOString(),
    deliveredBy: by,
    expiresAt: new Date(now.getTime() + CONFIRMATION_WINDOW_HOURS * 3600_000).toISOString(),
  };
  await preorderRepository.update(preorderId, { status: "livrata", deliveredAt: patch.deliveredAt });
  const updated = (await confirmationRepository.update(confirmation.id, patch)) ?? { ...confirmation, ...patch };

  const link = clientUrl(await requestOrigin(), updated);
  const first = preorder.customer.name.split(" ")[0];
  const sent = await sendEmail({
    to: preorder.customer.email,
    subject: `Confirmă primirea comenzii ${preorder.number} – Puii mei`,
    text: `Bună, ${first}!\n\nComanda ta ${preorder.number} a fost predată. Scanează codul QR „Client” de pe colet sau deschide linkul de mai jos, verifică pachetul și confirmă primirea (în cel mult ${CONFIRMATION_WINDOW_HOURS} ore):\n${link}\n\nMulțumim!\nPuii mei`,
    html: `<p>Bună, ${first}!</p><p>Comanda ta <strong>${preorder.number}</strong> a fost predată. Scanează codul QR „Client” de pe colet sau deschide linkul de mai jos, verifică pachetul și confirmă primirea (în cel mult <strong>${CONFIRMATION_WINDOW_HOURS} ore</strong>):</p><p><a href="${link}">Confirmă primirea comenzii</a></p><p>Mulțumim!<br>Puii mei</p>`,
  });
  if (sent) await confirmationRepository.update(confirmation.id, { sentByEmail: true });
  return { ...updated, sentByEmail: sent };
}

/** După confirmarea primirii: deschide lista de satisfacție (evaluarea). */
export async function openRating(confirmation: DeliveryConfirmation) {
  if (confirmation.ratingToken) return confirmation;
  const patch = {
    ratingToken: newToken(),
    ratingExpiresAt: new Date(Date.now() + RATING_WINDOW_DAYS * 86400_000).toISOString(),
  };
  return (await confirmationRepository.update(confirmation.id, patch)) ?? { ...confirmation, ...patch };
}
