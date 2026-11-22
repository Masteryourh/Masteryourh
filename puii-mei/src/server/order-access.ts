import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { canManageFarm } from "./delivery";
import { lotRepository } from "./repositories/catalog";
import type { Preorder } from "@/lib/domain";
import { normalizeLotCode } from "@/lib/lots";
import { preorderRepository } from "@/server/repositories/preorders";
import { emailEnabled, sendEmail } from "./email";
import { sendSms, smsEnabled } from "./sms";
import { signPayload, verifyPayload } from "./session-token";
import { ensureTrackingToken } from "./orders";

/** Accesul clientului la „Comanda mea” cu numărul precomenzii + PIN valabil 24 de ore. */
const PIN_HOURS = 24;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const COOKIE = "puii_comanda";

const pinHash = (orderId: string, pin: string) =>
  createHmac("sha256", process.env.SESSION_SECRET || `puii-mei:${process.env.ADMIN_PASSWORD ?? ""}`).update(`${orderId}:${pin}`).digest("hex");

export const maskPhone = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length >= 3 ? `••• ${d.slice(-3)}` : "telefonul tău";
};

export type PinRequest =
  | { ok: true; channel: "sms" | "email" | "manual"; masked: string; number: string }
  | { ok: false; error: string };

export async function requestOrderPin(numberInput: string): Promise<PinRequest> {
  const number = normalizeLotCode(numberInput);
  const p = number ? await preorderRepository.byNumber(number) : null;
  if (!p || p.status === "anulata") return { ok: false, error: "Nu am găsit o precomandă activă cu acest număr." };
  const last = p.accessPin?.requestedAt ? Date.parse(p.accessPin.requestedAt) : 0;
  if (Date.now() - last < RESEND_SECONDS * 1000) {
    return { ok: true, channel: p.accessPin!.channel, masked: maskPhone(p.customer.phone), number: p.number };
  }
  const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const text = `Puii mei: PIN-ul pentru comanda ${p.number} este ${pin}. Valabil ${PIN_HOURS} de ore.`;
  let channel: "sms" | "email" | "manual" = "manual";
  if (smsEnabled() && (await sendSms(p.customer.phone, text))) channel = "sms";
  else if (emailEnabled() && p.customer.email && (await sendEmail({ to: p.customer.email, subject: `PIN pentru comanda ${p.number}`, text, html: `<p>${text}</p>` }))) channel = "email";
  const now = new Date();
  await preorderRepository.update(p.id, {
    accessPin: {
      hash: pinHash(p.id, pin),
      requestedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PIN_HOURS * 3600_000).toISOString(),
      attempts: 0,
      channel,
      ...(channel === "manual" ? { manual: pin } : {}),
    },
  });
  if (channel === "manual") console.info(`[puii-mei] PIN cerut pentru ${p.number} (SMS neconfigurat): se trimite manual din admin.`);
  return { ok: true, channel, masked: maskPhone(p.customer.phone), number: p.number };
}

export async function verifyOrderPin(numberInput: string, pinInput: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const p = await preorderRepository.byNumber(normalizeLotCode(numberInput));
  const pin = pinInput.replace(/\D/g, "");
  const a = p?.accessPin;
  if (!p || !a) return { ok: false, error: "Cere întâi un PIN pentru această precomandă." };
  if (Date.parse(a.expiresAt) < Date.now()) return { ok: false, error: "PIN-ul a expirat. Cere unul nou." };
  if (a.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Prea multe încercări greșite. Cere un PIN nou (după un minut)." };
  const expected = Buffer.from(a.hash, "hex");
  const got = Buffer.from(pinHash(p.id, pin), "hex");
  if (pin.length !== 6 || !timingSafeEqual(expected, got)) {
    await preorderRepository.update(p.id, { accessPin: { ...a, attempts: a.attempts + 1 } });
    return { ok: false, error: `PIN greșit. Mai ai ${Math.max(0, MAX_ATTEMPTS - a.attempts - 1)} încercări.` };
  }
  await grantOrderAccess(p, Date.parse(a.expiresAt));
  return { ok: true, token: await ensureTrackingToken(p) };
}

/** Cookie semnat: acces la comandă până la expirarea PIN-ului (24 de ore). */
export async function grantOrderAccess(p: Preorder, until = Date.now() + PIN_HOURS * 3600_000) {
  const exp = Math.floor(until / 1000);
  // Legat de numărul comenzii-mamă, ca să meargă și pentru părțile unei comenzi împărțite.
  (await cookies()).set(COOKIE, signPayload({ num: p.parentNumber ?? p.number, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, exp - Math.floor(Date.now() / 1000)),
  });
}

/** Comanda deschisă cu PIN în ultimele 24 de ore (pentru mesajul „acces valabil până la …”). */
export async function orderAccessUntil(p: Preorder) {
  const v = verifyPayload<{ num: string; exp: number }>((await cookies()).get(COOKIE)?.value);
  return v && (v.num === p.number || v.num === p.parentNumber) ? new Date(v.exp * 1000) : null;
}

/** Cine poate vedea comanda: clientul cu PIN (24 h), adminul, gospodarul lotului. */
export async function canViewOrder(p: Preorder) {
  if (await orderAccessUntil(p)) return true;
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!p.lotCode) return false;
  const lot = await lotRepository.byCode(p.lotCode, { all: true });
  return Boolean(lot && canManageFarm(user, lot.farmSlug));
}

/** Pentru acțiunile de pe pagina comenzii (plată, anulare, alegeri). */
export async function requireOrderAccess(token: string) {
  const p = await preorderRepository.byTrackingToken(token);
  if (!p || !(await canViewOrder(p))) redirect(`/comanda?nr=${encodeURIComponent(p?.number ?? "")}`);
  return p;
}
