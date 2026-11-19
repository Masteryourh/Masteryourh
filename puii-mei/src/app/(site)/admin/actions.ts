"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { PreorderStatus } from "@/lib/domain";
import { CONFIRMATION_WINDOW_HOURS } from "@/lib/confirmation";
import { normalizeLotCode } from "@/lib/lots";
import { isValidAdminAuthorization } from "@/server/auth";
import { preorderRepository } from "@/server/repositories/preorders";
import { confirmationRepository } from "@/server/repositories/confirmations";
import { lotRepository } from "@/server/repositories/catalog";
import { sendEmail } from "@/server/email";

const allowed: PreorderStatus[] = ["noua", "confirmata", "alocata-lot", "in-livrare", "livrata", "anulata"];

async function requireAdminAndOrigin() {
  const h = await headers();
  if (!isValidAdminAuthorization(h.get("authorization"))) throw new Error("Neautorizat");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.puiimei.ro";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function updatePreorderStatus(formData: FormData) {
  const origin = await requireAdminAndOrigin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PreorderStatus;
  if (!id || !allowed.includes(status)) throw new Error("Date invalide");
  const preorder = await preorderRepository.updateStatus(id, status);

  // La marcarea ca livrată: link de confirmare a primirii, trimis automat clientului.
  if (preorder && status === "livrata") {
    const lot = preorder.lotCode ? await lotRepository.byCode(preorder.lotCode) : null;
    const { confirmation, created } = await confirmationRepository.createFor(preorder, lot?.farmSlug ?? null);
    if (created) {
      await preorderRepository.update(id, { deliveredAt: confirmation.deliveredAt });
      const link = `${origin}/confirmare/${confirmation.token}`;
      const first = preorder.customer.name.split(" ")[0];
      const sent = await sendEmail({
        to: preorder.customer.email,
        subject: `Confirmă primirea comenzii ${preorder.number} – Puii mei`,
        text: `Bună, ${first}!\n\nComanda ta ${preorder.number} a fost predată. Te rugăm să confirmi în ${CONFIRMATION_WINDOW_HOURS} ore starea în care ai primit-o:\n${link}\n\nMulțumim!\nPuii mei`,
        html: `<p>Bună, ${first}!</p><p>Comanda ta <strong>${preorder.number}</strong> a fost predată. Te rugăm să confirmi în <strong>${CONFIRMATION_WINDOW_HOURS} ore</strong> starea în care ai primit-o:</p><p><a href="${link}">Confirmă primirea comenzii</a></p><p>Mulțumim!<br>Puii mei</p>`,
      });
      if (sent) await confirmationRepository.update(confirmation.id, { sentByEmail: true });
    }
  }
  revalidatePath("/admin", "layout");
}

/** Alocă (sau schimbă) lotul unei precomenzi – necesar pentru a ști gospodăria. */
export async function updatePreorderLot(formData: FormData) {
  await requireAdminAndOrigin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("lotCode") ?? "");
  const lot = raw ? await lotRepository.byCode(normalizeLotCode(raw)) : null;
  if (!id || (raw && !lot)) throw new Error("Lot invalid");
  await preorderRepository.update(id, { lotCode: lot?.code ?? null });
  const confirmation = await confirmationRepository.byPreorder(id);
  if (confirmation && !confirmation.submittedAt) {
    await confirmationRepository.update(id, { lotCode: lot?.code ?? null, farmSlug: lot?.farmSlug ?? null });
  }
  revalidatePath("/admin", "layout");
}
