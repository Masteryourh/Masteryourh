import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { canManageFarm } from "./delivery";
import { lotRepository } from "./repositories/catalog";
import type { Preorder } from "@/lib/domain";
import { normalizeLotCode } from "@/lib/lots";
import { preorderRepository } from "@/server/repositories/preorders";
import { store } from "@/server/db/store";
import { clientIp, hitRateLimit } from "./rate-limit";
import { emailEnabled, sendEmail } from "./email";
import { sendSms, smsEnabled } from "./sms";
import { keyedHash, sessionSecretReady, signPayload, verifyPayload } from "./session-token";
import { ensureTrackingToken } from "./orders";

/** Accesul clientului la „Comanda mea” cu numărul precomenzii + PIN valabil 24 de ore. */
const PIN_HOURS = 24;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const COOKIE = "puii_comanda";

const pinHash = (orderId: string, pin: string) => keyedHash("pin", `${orderId}:${pin}`);

export const maskPhone = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length >= 3 ? `••• ${d.slice(-3)}` : "telefonul tău";
};

export type PinRequest =
  | { ok: true; channel: "sms" | "email" | "manual"; masked: string; number: string }
  | { ok: false; error: string };

const PIN_REQUESTS_PER_ORDER_PER_DAY = 5;
const PIN_REQUESTS_PER_IP_PER_DAY = 30;
const PIN_CHECKS_PER_IP_PER_HOUR = 30;

export async function requestOrderPin(numberInput: string): Promise<PinRequest> {
  if (!sessionSecretReady()) return { ok: false, error: "Accesul la comenzi e oprit temporar (platforma nu e configurată complet). Încearcă mai târziu." };
  const number = normalizeLotCode(numberInput);
  const p = number ? await preorderRepository.byNumber(number) : null;
  if (!p || p.status === "anulata") return { ok: false, error: "Nu am găsit o precomandă activă cu acest număr." };
  const ip = await clientIp();
  const day = new Date().toISOString().slice(0, 10);
  // Limita pe IP se consumă doar când s-ar emite un PIN nou (apăsările repetate în fereastra de retrimitere nu contează).
  const inResendWindow = !!p.accessPin && Date.now() - Date.parse(p.accessPin.requestedAt) < RESEND_SECONDS * 1000;
  if (!inResendWindow && !(await hitRateLimit(`pin-cerere:ip:${ip}:${day}`, PIN_REQUESTS_PER_IP_PER_DAY, 86400)).allowed) {
    return { ok: false, error: "Prea multe cereri de PIN de pe această conexiune azi. Încearcă mâine sau scrie-ne." };
  }

  // Generarea PIN-ului: atomic pe comandă (cererile simultane nu creează PIN-uri diferite).
  const expected: "sms" | "email" | "manual" = smsEnabled() ? "sms" : emailEnabled() && p.customer.email ? "email" : "manual";
  const issued = await store.transact<Preorder, { pin: string | null; limited: boolean; channel: "sms" | "email" | "manual" }>(
    "preorders",
    p.id,
    (cur) => {
      const a = cur?.accessPin;
      if (a && Date.now() - Date.parse(a.requestedAt) < RESEND_SECONDS * 1000) return { result: { pin: null, limited: false, channel: a.channel } };
      // Limita pe comandă se ține în aceeași înregistrare (fără tranzacții imbricate).
      const countToday = a?.requestsDay === day ? (a.requestsCount ?? 0) : 0;
      if (countToday >= PIN_REQUESTS_PER_ORDER_PER_DAY) return { result: { pin: null, limited: true, channel: a?.channel ?? expected } };
      const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const now = new Date();
      return {
        patch: {
          accessPin: {
            hash: pinHash(p.id, pin),
            requestedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + PIN_HOURS * 3600_000).toISOString(),
            attempts: 0,
            channel: expected,
            requestsDay: day,
            requestsCount: countToday + 1,
            ...(expected === "manual" ? { manual: pin } : {}),
          },
        },
        result: { pin, limited: false, channel: expected },
      };
    },
  );
  if (issued.limited) return { ok: false, error: "Ai cerut deja de prea multe ori un PIN pentru această comandă azi. Încearcă mâine sau scrie-ne." };

  let channel = issued.channel;
  if (issued.pin && channel !== "manual") {
    const text = `Puii mei: PIN-ul pentru comanda ${p.number} este ${issued.pin}. Valabil ${PIN_HOURS} de ore.`;
    const sent =
      channel === "sms"
        ? await sendSms(p.customer.phone, text)
        : await sendEmail({ to: p.customer.email, subject: `PIN pentru comanda ${p.number}`, text, html: `<p>${text}</p>` });
    if (!sent) {
      // Trimiterea a eșuat: PIN-ul devine vizibil adminului, care îl trimite manual.
      channel = "manual";
      await store.transact<Preorder, void>("preorders", p.id, (cur) => ({
        patch: cur?.accessPin ? { accessPin: { ...cur.accessPin, channel: "manual", manual: issued.pin! } } : undefined,
        result: undefined,
      }));
    }
  }
  if (issued.pin && channel === "manual") console.info(`[puii-mei] PIN cerut pentru ${p.number} (trimitere automată indisponibilă): se trimite manual din admin.`);
  return { ok: true, channel, masked: maskPhone(p.customer.phone), number: p.number };
}

type VerifyResult = { ok: true; expiresAt: string } | { ok: false; error: string };

/**
 * Verificarea PIN-ului: contorul de încercări se citește, se verifică și se incrementează într-o singură operație
 * atomică (repară V-01: cererile simultane nu mai pot ocoli limita de 5 încercări).
 */
export async function verifyOrderPin(numberInput: string, pinInput: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const p = await preorderRepository.byNumber(normalizeLotCode(numberInput));
  const pin = pinInput.replace(/\D/g, "");
  if (!p) return { ok: false, error: "Cere întâi un PIN pentru această precomandă." };
  const ip = await clientIp();
  if (!(await hitRateLimit(`pin-verificare:ip:${ip}`, PIN_CHECKS_PER_IP_PER_HOUR, 3600)).allowed) {
    return { ok: false, error: "Prea multe încercări de pe această conexiune. Încearcă peste o oră." };
  }
  const r = await store.transact<Preorder, VerifyResult>("preorders", p.id, (cur) => {
    const a = cur?.accessPin;
    if (!a) return { result: { ok: false, error: "Cere întâi un PIN pentru această precomandă." } };
    if (Date.parse(a.expiresAt) < Date.now()) return { result: { ok: false, error: "PIN-ul a expirat. Cere unul nou." } };
    if (a.attempts >= MAX_ATTEMPTS) return { result: { ok: false, error: "Prea multe încercări greșite. Cere un PIN nou (după un minut)." } };
    const expected = Buffer.from(a.hash, "hex");
    const got = Buffer.from(pinHash(p.id, pin), "hex");
    if (pin.length !== 6 || !timingSafeEqual(expected, got)) {
      const attempts = a.attempts + 1;
      return {
        patch: { accessPin: { ...a, attempts } },
        result: { ok: false, error: `PIN greșit. Mai ai ${Math.max(0, MAX_ATTEMPTS - attempts)} încercări.` },
      };
    }
    // Corect: PIN-ul manual nu mai e afișat adminului.
    return { patch: a.manual ? { accessPin: { ...a, manual: undefined } } : undefined, result: { ok: true, expiresAt: a.expiresAt } };
  });
  if (!r.ok) return r;
  await grantOrderAccess(p, Date.parse(r.expiresAt));
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

export async function clearOrderAccess() {
  (await cookies()).delete(COOKIE);
}

/** Comanda la care clientul are acces acum (PIN în ultimele 24 h), pentru „Continuă la comandă”. */
export async function currentOrderAccess() {
  const v = verifyPayload<{ num: string; exp: number }>((await cookies()).get(COOKIE)?.value);
  if (!v) return null;
  const p = await preorderRepository.byNumber(v.num);
  return p && p.status !== "anulata" ? { number: p.number, token: await ensureTrackingToken(p) } : null;
}
