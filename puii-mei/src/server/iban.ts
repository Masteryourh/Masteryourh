import "server-only";
import { randomUUID } from "node:crypto";
import type { FarmPaymentDetails, User } from "@/lib/domain";
import { site } from "@/lib/site";
import { store } from "./db/store";
import { cancelChange, confirmByPhone, maskIban, rejectChange, requestChange, type BankIdentity, type PaymentDoc } from "./iban-core";
import { notifyAdmins, notifyFarm } from "./notifications";
import { auditIban } from "./repositories/farm-payments";
import { userRepository } from "./repositories/users";
import { sendSms, smsEnabled } from "./sms";

/**
 * Schimbarea contului bancar al gospodăriei (CG-03, decizia PO: varianta b; etapa fără MFA). Logica: `iban-core.ts`.
 * Fiecare pas e o singură tranzacție pe documentul gospodăriei (cererile simultane nu se pot amesteca) și o intrare în
 * jurnalul `iban-audit` (doar adăugare).
 */
const COLLECTION = "farm-payments";
const actorOf = (u: User) => ({ id: u.id, name: `${u.name} (${u.role})` });

/** Numerele de telefon ale gospodăriei cunoscute acum (doar adminul le poate schimba): aici se face apelul de verificare. */
async function knownPhones(farmSlug: string) {
  return (await userRepository.list()).filter((u) => u.role === "gospodar" && u.farmSlug === farmSlug && u.status === "activ" && u.phone).map((u) => u.phone);
}

async function notifyAll(farmSlug: string, changeId: string, iban: string, phones: string[], subject: string, text: string) {
  try {
    await Promise.all([
      notifyFarm(farmSlug, subject, text),
      notifyAdmins(`${subject} (${farmSlug})`, `${text}\n${site.url}/admin`),
      ...(smsEnabled() ? phones.map((p) => sendSms(p, `Puii mei: ${subject}. Daca nu ai fost tu, suna-ne imediat.`)) : []),
    ]);
    await auditIban({ farmSlug, changeId, action: "notificare", actor: "sistem", iban, note: subject });
  } catch (err) {
    // Notificarea a eșuat: cererea rămâne în verificare (fără apel confirmat nu se activează nimic).
    console.error("[puii-mei] Notificarea pentru schimbarea IBAN a eșuat", err);
    await auditIban({ farmSlug, changeId, action: "notificare-esuata", actor: "sistem", iban, note: subject });
  }
}

/**
 * Salvează datele de plată: prețurile se schimbă imediat; contul bancar (titular, IBAN, bancă), dacă e diferit de cel
 * activ, devine o cerere în verificare. Contul activ rămâne cel vizibil clienților.
 */
export async function savePaymentDetails(user: User, farmSlug: string, account: BankIdentity, prices: { feedPricePerKg: number; chickPricePerBird: number }) {
  const phones = await knownPhones(farmSlug);
  const now = new Date();
  const initial: FarmPaymentDetails = { id: farmSlug, holder: "", iban: "", bank: "", ...prices, updatedAt: now.toISOString(), updatedBy: actorOf(user).name };
  const r = await store.transact<FarmPaymentDetails, ReturnType<typeof requestChange>>(
    COLLECTION,
    farmSlug,
    (cur) => {
      const base = { ...(cur ?? initial), ...prices, updatedAt: now.toISOString(), updatedBy: actorOf(user).name } as PaymentDoc;
      const res = requestChange(base, account, actorOf(user), phones, now, randomUUID());
      return { patch: res.doc, result: res };
    },
    initial,
  );
  if (r.replaced) await auditIban({ farmSlug, changeId: r.replaced.id, action: "inlocuita", actor: actorOf(user).name, actorId: user.id, iban: r.replaced.iban });
  if (r.change && r.change.requestedAt === now.toISOString()) {
    await auditIban({ farmSlug, changeId: r.change.id, action: "cerere", actor: actorOf(user).name, actorId: user.id, iban: r.change.iban });
    await notifyAll(
      farmSlug,
      r.change.id,
      r.change.iban,
      phones,
      "S-a cerut schimbarea contului bancar",
      `${actorOf(user).name} a cerut schimbarea contului în care clienții plătesc avansul, în ${maskIban(r.change.iban)}.\n` +
        `Contul nou NU se folosește până nu te sună PUII MEI să confirmi${r.change.activatesAfter > now.toISOString() ? " și nu trec 24 de ore" : ""}.\n` +
        `Dacă nu ai cerut tu, intră în panou și apasă „Nu am cerut eu”, sau sună-ne imediat.`,
    );
  }
  return r.change;
}

/** Adminul confirmă apelul telefonic către gospodar. */
export async function confirmIbanByPhone(admin: User, farmSlug: string, changeId: string, phone: string, note?: string) {
  const r = await store.transact<FarmPaymentDetails, ReturnType<typeof confirmByPhone>>(COLLECTION, farmSlug, (cur) => {
    if (!cur) return { result: { ok: false, error: "Gospodăria nu are date de plată." } };
    const res = confirmByPhone(cur as PaymentDoc, changeId, actorOf(admin), phone, new Date(), note);
    return res.ok ? { patch: res.doc, result: res } : { result: res };
  });
  if (r.ok) {
    await auditIban({ farmSlug, changeId, action: "confirmata", actor: actorOf(admin).name, actorId: admin.id, iban: r.change.iban, note: `apel la ${phone}` });
    if (r.doc.ibanChange?.status === "activ") await auditIban({ farmSlug, changeId, action: "activata", actor: "sistem", iban: r.change.iban });
  }
  return r;
}

export async function rejectIban(admin: User, farmSlug: string, changeId: string, reason: string) {
  const r = await store.transact<FarmPaymentDetails, ReturnType<typeof rejectChange>>(COLLECTION, farmSlug, (cur) => {
    if (!cur) return { result: { ok: false, error: "Gospodăria nu are date de plată." } };
    const res = rejectChange(cur as PaymentDoc, changeId, actorOf(admin), reason, new Date());
    return res.ok ? { patch: res.doc, result: res } : { result: res };
  });
  if (r.ok) {
    await auditIban({ farmSlug, changeId, action: "respinsa", actor: actorOf(admin).name, actorId: admin.id, iban: r.change.iban, note: reason });
    await notifyFarm(farmSlug, "Schimbarea contului bancar a fost respinsă", `Cererea pentru ${maskIban(r.change.iban)} a fost respinsă: ${reason}. Clienții plătesc în continuare în contul vechi.`);
  }
  return r;
}

/**
 * „Nu am cerut eu”: cererea se anulează, iar contul gospodarului care a cerut-o se blochează (sesiunile lui se închid)
 * până la verificarea de către PUII MEI. Un cont de administrator nu se blochează automat: se trimite alertă.
 */
export async function reportUnrequested(user: User, farmSlug: string, changeId: string) {
  const r = await store.transact<FarmPaymentDetails, ReturnType<typeof cancelChange>>(COLLECTION, farmSlug, (cur) => {
    if (!cur) return { result: { ok: false, error: "Gospodăria nu are date de plată." } };
    const res = cancelChange(cur as PaymentDoc, changeId, actorOf(user), new Date());
    return res.ok ? { patch: res.doc, result: res } : { result: res };
  });
  if (!r.ok) return r;
  await auditIban({ farmSlug, changeId, action: "anulata", actor: actorOf(user).name, actorId: user.id, iban: r.change.iban, note: "Nu am cerut eu" });
  const requester = await userRepository.byId(r.change.requestedById);
  if (requester && requester.role === "gospodar" && requester.status === "activ") {
    await userRepository.update(requester.id, { status: "dezactivat", sessionVersion: requester.sessionVersion + 1 });
    await auditIban({ farmSlug, changeId, action: "cont-blocat", actor: actorOf(user).name, actorId: user.id, iban: r.change.iban, note: `cont blocat: ${requester.email}` });
  }
  await notifyAdmins(
    `INCIDENT: schimbare de IBAN necerută (${farmSlug})`,
    `${actorOf(user).name} a raportat că nu a cerut schimbarea contului în ${maskIban(r.change.iban)} (cerută de ${r.change.requestedBy}). ` +
      `Cererea a fost anulată${requester?.role === "gospodar" ? ", iar contul celui care a cerut-o a fost blocat" : ""}. Verifică.\n${site.url}/admin`,
  );
  return r;
}
