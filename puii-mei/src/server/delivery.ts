import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { GeoPoint, Parcel, Tour, User } from "@/lib/domain";
import { DELIVERY, tempOk } from "@/lib/delivery";
import { availabilityDate } from "@/lib/lots";
import { optimizeOrder } from "@/lib/route";
import { hashPassword, verifyPassword } from "./password";
import { farmRepository, lotRepository } from "./repositories/catalog";
import { preorderRepository } from "./repositories/preorders";
import { eventRepository, newPin, newToken, parcelRepository, tourRepository } from "./repositories/delivery";
import { sendEmail } from "./email";
import { notifyAdmins, notifyFarm, notifyOrderEvent } from "./notifications";
import { site } from "@/lib/site";
import { store } from "./db/store";
import { safeEqual } from "./session-token";

/* ------------------------------------------------------------------ */
/* Utilitare                                                          */
/* ------------------------------------------------------------------ */

export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.puiimei.ro";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const courierParcelUrl = (origin: string, p: Parcel) => `${origin}/livrare/c/${p.courierToken}`;
export const clientParcelUrl = (origin: string, p: Parcel) => `${origin}/confirmare/${p.clientToken}`;
export const courierTourUrl = (origin: string, t: Tour) => `${origin}/livrare/${t.token}`;

/** Gospodarul își administrează doar gospodăria; adminul, oricare. */
export function canManageFarm(user: User, farmSlug: string) {
  return user.role === "admin" || (user.role === "gospodar" && user.farmSlug === farmSlug);
}

const actorOf = (user: User) => `${user.name} (${user.role})`;
const courierActor = (t: Tour) => `${t.courier?.name ?? "Curier"} (curier)`;

function log(tour: Tour, type: string, actor: string, message: string, extra: { lat?: number; lng?: number; alert?: boolean } = {}) {
  return eventRepository.add({ tourId: tour.id, type, actor, message, ...extra });
}

/** Coordonatele de pornire ale turei: gospodăria (sau centrul zonei pilot). */
export async function tourStart(farmSlug: string): Promise<GeoPoint> {
  const farm = await farmRepository.bySlug(farmSlug, { includeInactive: true });
  return farm?.coordinates ?? { lat: 47.5303, lng: 25.5512 };
}

/* ------------------------------------------------------------------ */
/* Etichete (generate de gospodar)                                    */
/* ------------------------------------------------------------------ */

/** Creează sau regenerează eticheta unei precomenzi. Regenerarea invalidează codurile vechi. */
export async function generateLabel(preorderId: string, user: User, { regenerate = false } = {}) {
  const preorder = await preorderRepository.byId(preorderId);
  if (!preorder || preorder.status === "anulata") throw new Error("Precomanda nu există sau e anulată");
  if (!preorder.lotCode) throw new Error("Precomanda nu are lot alocat");
  const lot = await lotRepository.byCode(preorder.lotCode);
  if (!lot || !canManageFarm(user, lot.farmSlug)) throw new Error("Neautorizat");

  const existing = await parcelRepository.byId(preorderId);
  if (existing && !regenerate) return existing;
  if (existing?.delivered) throw new Error("Coletul a fost deja predat");

  const expires = new Date(availabilityDate(lot).getTime() + DELIVERY.shelfLifeDays * 86400_000);
  if (existing) {
    return parcelRepository.update(existing.id, {
      version: existing.version + 1,
      clientToken: newToken(),
      courierToken: newToken(),
      replacedTokens: [
        ...existing.replacedTokens,
        { clientToken: existing.clientToken, courierToken: existing.courierToken, replacedAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      createdBy: actorOf(user),
    });
  }
  return parcelRepository.create({
    id: preorder.id,
    preorderNumber: preorder.number,
    farmSlug: lot.farmSlug,
    lotCode: lot.code,
    birds: preorder.birds,
    version: 1,
    clientToken: newToken(),
    courierToken: newToken(),
    replacedTokens: [],
    createdAt: new Date().toISOString(),
    createdBy: actorOf(user),
    expiresOn: expires.toISOString().slice(0, 10),
  });
}

/* ------------------------------------------------------------------ */
/* Ture                                                               */
/* ------------------------------------------------------------------ */

async function parcelPoints(parcels: Parcel[]) {
  const preorders = await Promise.all(parcels.map((p) => preorderRepository.byId(p.id)));
  return preorders.map((o) => o?.location ?? null);
}

/** Ordinea optimă a coletelor; cele fără pin rămân la final, în ordinea dată. */
export async function optimizedParcelOrder(farmSlug: string, parcelIds: string[]) {
  const parcels = (await Promise.all(parcelIds.map((id) => parcelRepository.byId(id)))).filter(Boolean) as Parcel[];
  const points = await parcelPoints(parcels);
  const withPts = parcels.map((p, i) => ({ id: p.id, pt: points[i] })).filter((x) => x.pt);
  const without = parcels.filter((_, i) => !points[i]).map((p) => p.id);
  const order = optimizeOrder(await tourStart(farmSlug), withPts.map((x) => x.pt!));
  return [...order.map((i) => withPts[i].id), ...without];
}

export async function createTour(
  input: { farmSlug: string; date: string; parcelIds: string[]; durationHours: number },
  user: User,
) {
  if (!canManageFarm(user, input.farmSlug)) throw new Error("Neautorizat");
  const parcels = await Promise.all(input.parcelIds.map((id) => parcelRepository.byId(id)));
  for (const p of parcels) {
    if (!p || p.farmSlug !== input.farmSlug) throw new Error("Colet invalid");
    if (p.tourId) {
      const t = await tourRepository.byId(p.tourId);
      if (t && t.status !== "anulata") throw new Error(`Coletul ${p.preorderNumber} e deja într-o tură`);
    }
  }
  const tour = await tourRepository.create({
    farmSlug: input.farmSlug,
    date: input.date,
    createdBy: actorOf(user),
    parcelIds: await optimizedParcelOrder(input.farmSlug, input.parcelIds),
    durationHours: input.durationHours,
  });
  for (const p of parcels) await parcelRepository.update(p!.id, { tourId: tour.id });
  for (const p of parcels) {
    const updated = await preorderRepository.updateStatus(p!.id, "in-livrare");
    if (updated) await notifyOrderEvent(updated, "livrare-programata", input.date.split("-").reverse().join("."));
  }
  await log(tour, "creare", actorOf(user), `Tură creată pentru ${input.date}, ${parcels.length} colete, traseu optimizat automat.`);
  return tour;
}

export async function reorderTour(tourId: string, parcelIds: string[], user: User, how: "manual" | "optim") {
  const tour = await tourRepository.byId(tourId);
  if (!tour || !canManageFarm(user, tour.farmSlug)) throw new Error("Neautorizat");
  if (tour.status !== "planificata") throw new Error("Traseul se poate schimba doar înainte de pornire");
  const same = parcelIds.length === tour.parcelIds.length && parcelIds.every((id) => tour.parcelIds.includes(id));
  if (!same) throw new Error("Lista de colete nu corespunde");
  const order = how === "optim" ? await optimizedParcelOrder(tour.farmSlug, parcelIds) : parcelIds;
  await tourRepository.update(tour.id, { parcelIds: order });
  await log(tour, "traseu", actorOf(user), how === "optim" ? "Traseu recalculat automat." : "Ordinea opririlor modificată manual.");
}

export async function cancelTour(tourId: string, user: User) {
  const tour = await tourRepository.byId(tourId);
  if (!tour || !canManageFarm(user, tour.farmSlug)) throw new Error("Neautorizat");
  if (tour.status !== "planificata") throw new Error("Doar o tură nepornită se poate anula");
  await tourRepository.update(tour.id, { status: "anulata" });
  for (const id of tour.parcelIds) {
    await parcelRepository.update(id, { tourId: undefined });
    await preorderRepository.updateStatus(id, "alocata-lot");
  }
  await log(tour, "anulare", actorOf(user), "Tură anulată.");
}

/* ------------------------------------------------------------------ */
/* Accesul temporar al curierului                                     */
/* ------------------------------------------------------------------ */

export type DriverData = { name: string; phone: string; plate: string; vehicleType: string; atp: string };

/**
 * Verifică un PIN de curier și ține contorul de încercări într-o singură operație atomică pe tură:
 * blocajul și limita de încercări se respectă și la cereri simultane.
 */
async function countPinAttempt(tourId: string, matches: (t: Tour) => boolean | Promise<boolean>, resetOnSuccess = false) {
  type R = { ok: boolean; counted: boolean; failed: number; locked: boolean };
  return store.transact<Tour, R>("tours", tourId, async (t) => {
    if (!t) return { result: { ok: false, counted: false, failed: 0, locked: false } };
    if (t.locked) return { result: { ok: false, counted: false, failed: t.failedPins, locked: true } };
    if (await matches(t)) return { patch: resetOnSuccess ? { failedPins: 0 } : undefined, result: { ok: true, counted: false, failed: 0, locked: false } };
    const failed = t.failedPins + 1;
    const locked = failed >= DELIVERY.maxPinAttempts;
    return { patch: { failedPins: failed, locked }, result: { ok: false, counted: true, failed, locked } };
  });
}

/** Curierul introduce PIN-ul de ridicare: împerechere temporară cu gospodarul. */
export async function pairWithPickupPin(tour: Tour, pin: string, driver: DriverData) {
  if (tour.status === "incheiata" || tour.status === "anulata") return { ok: false as const, error: "Tura nu mai este activă." };
  if (tour.locked) return { ok: false as const, error: "Accesul este blocat. Cere gospodarului să-l deblocheze." };
  if (tour.courier?.personalPinHash) return { ok: false as const, error: "Tura are deja un curier. Intră cu PIN-ul tău personal." };
  // Verificare + contor atomic (repară V-02: cererile simultane nu ocolesc limita); comparare în timp constant.
  const check = await countPinAttempt(tour.id, (t) => !t.pickupPinUsed && safeEqual(pin, t.pickupPin));
  if (!check.ok) {
    if (check.counted) {
      await log(tour, "pin-gresit", driver.name || "Necunoscut", `PIN de ridicare greșit (${check.failed}/${DELIVERY.maxPinAttempts}).`, { alert: check.locked });
    }
    return { ok: false as const, error: check.locked ? "Prea multe încercări. Accesul a fost blocat." : "PIN greșit." };
  }
  const courier = { ...driver, pairedAt: new Date().toISOString(), pairedBy: "pin" as const, sessionVersion: (tour.courier?.sessionVersion ?? 0) + 1 };
  const updated = await tourRepository.update(tour.id, { courier, pickupPinUsed: true, failedPins: 0 });
  await log(tour, "imperechere", `${driver.name} (curier)`, `Curier împerecheat cu PIN-ul de ridicare. Mașina ${driver.plate}.`);
  return { ok: true as const, tour: updated! };
}

export async function requestPin(tour: Tour, driver: DriverData) {
  const request = { id: randomUUID(), at: new Date().toISOString(), status: "asteapta" as const, ...driver };
  await tourRepository.update(tour.id, { pinRequest: request });
  await log(tour, "cerere-pin", `${driver.name} (curier)`, `Curierul cere confirmarea ridicării (tel. ${driver.phone}).`);
  return request;
}

/** Gospodarul (sau adminul) confirmă cererea curierului. */
export async function decidePinRequest(tourId: string, requestId: string, approve: boolean, user: User) {
  const tour = await tourRepository.byId(tourId);
  if (!tour || !canManageFarm(user, tour.farmSlug)) throw new Error("Neautorizat");
  if (!tour.pinRequest || tour.pinRequest.id !== requestId || tour.pinRequest.status !== "asteapta") throw new Error("Cererea nu mai este valabilă");
  await tourRepository.update(tour.id, { pinRequest: { ...tour.pinRequest, status: approve ? "aprobata" : "respinsa" } });
  await log(tour, "cerere-pin", actorOf(user), approve ? "Gospodarul a confirmat ridicarea pentru curier." : "Cererea curierului a fost respinsă.");
}

/** Curierul a cerut PIN-ul și gospodarul a confirmat: împerechere. */
export async function pairByApprovedRequest(tour: Tour, requestId: string) {
  if (!tour.pinRequest || tour.pinRequest.id !== requestId || tour.pinRequest.status !== "aprobata") return null;
  if (tour.courier?.personalPinHash) return null;
  const { name, phone, plate, vehicleType, atp } = tour.pinRequest;
  const driver: DriverData = { name, phone, plate, vehicleType, atp };
  const courier = { ...driver, pairedAt: new Date().toISOString(), pairedBy: "confirmare" as const, sessionVersion: (tour.courier?.sessionVersion ?? 0) + 1 };
  const updated = await tourRepository.update(tour.id, { courier, pickupPinUsed: true, pinRequest: undefined, failedPins: 0 });
  await log(tour, "imperechere", `${driver.name} (curier)`, `Curier împerecheat prin confirmarea gospodarului. Mașina ${driver.plate}.`);
  return updated;
}

export async function setPersonalPin(tour: Tour, pin: string) {
  if (!/^\d{4}$/.test(pin) || !tour.courier) throw new Error("PIN invalid");
  await tourRepository.update(tour.id, { courier: { ...tour.courier, personalPinHash: await hashPassword(pin) } });
  await log(tour, "pin-personal", courierActor(tour), "Curierul și-a setat PIN-ul personal.");
}

export async function loginWithPersonalPin(tour: Tour, pin: string) {
  if (tour.locked) return { ok: false as const, error: "Accesul este blocat. Cere gospodarului să-l deblocheze." };
  if (!tour.courier?.personalPinHash) return { ok: false as const, error: "Tura nu are încă un curier." };
  const check = await countPinAttempt(tour.id, async (t) => Boolean(t.courier?.personalPinHash && (await verifyPassword(pin, t.courier.personalPinHash))), true);
  if (check.ok) {
    await log(tour, "reintrare", courierActor(tour), "Curierul a reintrat cu PIN-ul personal.");
    return { ok: true as const };
  }
  if (check.counted) await log(tour, "pin-gresit", "Necunoscut", `PIN personal greșit (${check.failed}/${DELIVERY.maxPinAttempts}).`, { alert: check.locked });
  return { ok: false as const, error: check.locked ? "Prea multe încercări. Accesul a fost blocat." : "PIN greșit." };
}

/** Deblocare (PIN-uri greșite) sau resetarea completă a accesului curierului. */
export async function resetCourierAccess(tourId: string, user: User, mode: "deblocare" | "resetare") {
  const tour = await tourRepository.byId(tourId);
  if (!tour || !canManageFarm(user, tour.farmSlug)) throw new Error("Neautorizat");
  if (mode === "deblocare") {
    await tourRepository.update(tour.id, { locked: false, failedPins: 0 });
    await log(tour, "deblocare", actorOf(user), "Acces deblocat.");
    return;
  }
  await tourRepository.update(tour.id, {
    locked: false,
    failedPins: 0,
    pickupPin: newPin(),
    pickupPinUsed: false,
    pinRequest: undefined,
    courier: tour.courier
      ? { ...tour.courier, personalPinHash: undefined, sessionVersion: tour.courier.sessionVersion + 1 }
      : undefined,
  });
  await log(tour, "resetare", actorOf(user), "Accesul curierului a fost resetat: PIN de ridicare nou, sesiunile vechi închise.", { alert: true });
}

/* ------------------------------------------------------------------ */
/* Pe traseu                                                          */
/* ------------------------------------------------------------------ */

export function assertActive(tour: Tour) {
  if (tour.status === "incheiata" || tour.status === "anulata") throw new Error("Tura nu mai este activă");
  if (tour.status === "in-curs" && tour.deadlineAt) {
    const extra = tour.extensions.filter((e) => e.status === "aprobata").reduce((s, e) => s + (e.hours ?? 0), 0);
    if (Date.now() > new Date(tour.deadlineAt).getTime() + extra * 3600_000) {
      throw new Error("Termenul turei a expirat. Cere o prelungire.");
    }
  }
}

export async function startTour(
  tour: Tour,
  data: { odometer: number; odometerPhotoId: string; platePhotoId: string; compartmentTemp: number; tempPhotoId: string; hygieneOk: boolean; lat?: number; lng?: number },
) {
  if (tour.status !== "planificata") throw new Error("Tura a pornit deja");
  const now = new Date();
  await tourRepository.update(tour.id, {
    status: "in-curs",
    startedAt: now.toISOString(),
    deadlineAt: new Date(now.getTime() + tour.durationHours * 3600_000).toISOString(),
    start: { at: now.toISOString(), ...data },
  });
  await log(tour, "pornire", courierActor(tour), `Tura a pornit. Km ${data.odometer}, compartiment ${data.compartmentTemp} °C, igienă ${data.hygieneOk ? "ok" : "neconformă"}. Termen: ${tour.durationHours} ore.`, { lat: data.lat, lng: data.lng, alert: !tempOk(data.compartmentTemp) || !data.hygieneOk });
}

export async function loadParcel(tour: Tour, parcel: Parcel, data: { temp: number; photoIds: string[]; lat?: number; lng?: number }) {
  assertActive(tour);
  if (tour.status !== "in-curs") throw new Error("Pornește întâi tura");
  if (parcel.tourId !== tour.id) throw new Error("Coletul nu face parte din această tură");
  if (parcel.loaded) throw new Error("Coletul a fost deja încărcat");
  await parcelRepository.update(parcel.id, { loaded: { at: new Date().toISOString(), ...data } });
  await log(tour, "incarcare", courierActor(tour), `Colet ${parcel.preorderNumber} încărcat, ${data.temp} °C, ${data.photoIds.length} fotografii.`, { lat: data.lat, lng: data.lng, alert: !tempOk(data.temp) });
}

export async function deliverParcel(
  tour: Tour,
  parcel: Parcel,
  data: { temp: number; tempPhotoId: string; signaturePhotoId: string; lat?: number; lng?: number; accuracy?: number },
) {
  assertActive(tour);
  if (parcel.tourId !== tour.id) throw new Error("Coletul nu face parte din această tură");
  if (!parcel.loaded) throw new Error("Coletul nu a fost încărcat la ridicare");
  if (parcel.delivered) throw new Error("Coletul a fost deja predat");
  const now = new Date();
  await parcelRepository.update(parcel.id, {
    delivered: { at: now.toISOString(), ...data },
    confirmationDeadline: new Date(now.getTime() + DELIVERY.confirmationHours * 3600_000).toISOString(),
  });
  const preorder = await preorderRepository.byId(parcel.id);
  await preorderRepository.update(parcel.id, {
    status: "livrata",
    deliveredAt: now.toISOString(),
    // Prima livrare reală fixează locația exactă a clientului, dacă lipsea.
    ...(!preorder?.location && data.lat && data.lng ? { location: { lat: data.lat, lng: data.lng } } : {}),
  });
  await log(tour, "predare", courierActor(tour), `Colet ${parcel.preorderNumber} predat, ${data.temp} °C, semnătură client.`, { lat: data.lat, lng: data.lng, alert: !tempOk(data.temp) });

  if (preorder) {
    const link = clientParcelUrl(await requestOrigin(), parcel);
    await sendEmail({
      to: preorder.customer.email,
      subject: `Confirmă primirea comenzii ${preorder.number} – Puii mei`,
      text: `Comanda ta ${preorder.number} a fost predată. Scanează codul QR „Client” de pe colet sau deschide ${link}, verifică pachetul și confirmă primirea în ${DELIVERY.confirmationHours} ore.`,
      html: `<p>Comanda ta <strong>${preorder.number}</strong> a fost predată.</p><p>Scanează codul QR „Client” de pe colet sau <a href="${link}">deschide confirmarea</a>, verifică pachetul și confirmă primirea în ${DELIVERY.confirmationHours} ore.</p>`,
    });
  }
}

export async function finishTour(tour: Tour, data: { odometer: number; odometerPhotoId: string; note: string; lat?: number; lng?: number }) {
  if (tour.status !== "in-curs") throw new Error("Tura nu este în curs");
  const parcels = await Promise.all(tour.parcelIds.map((id) => parcelRepository.byId(id)));
  const undelivered = parcels.filter((p) => p && !p.delivered).length;
  if (undelivered && data.note.trim().length < 10) throw new Error("Explică de ce nu au fost predate toate coletele.");
  await tourRepository.update(tour.id, { status: "incheiata", finishedAt: new Date().toISOString(), finish: { at: new Date().toISOString(), odometer: data.odometer, odometerPhotoId: data.odometerPhotoId, note: data.note } });
  const km = tour.start ? data.odometer - tour.start.odometer : 0;
  await log(tour, "final", courierActor(tour), `Tura s-a încheiat. ${km} km parcurși.${undelivered ? ` ${undelivered} colete nepredate.` : ""}${data.note ? ` Observații: ${data.note}` : ""}`, { lat: data.lat, lng: data.lng, alert: undelivered > 0 });
}

export async function requestExtension(tour: Tour, data: { reason: string; description: string; photoId: string; lat?: number; lng?: number }) {
  if (tour.status !== "in-curs") throw new Error("Tura nu este în curs");
  const ext = { id: randomUUID(), at: new Date().toISOString(), status: "asteapta" as const, ...data };
  await tourRepository.update(tour.id, { extensions: [...tour.extensions, ext] });
  await log(tour, "prelungire", courierActor(tour), `Cerere de prelungire: ${data.reason} – ${data.description}`, { lat: data.lat, lng: data.lng, alert: true });
  const text = `${tour.courier?.name ?? "Curierul"} cere prelungirea turei ${tour.code}: ${data.reason}${data.description ? ` – ${data.description}` : ""}.`;
  await notifyAdmins(`Cerere de prelungire · tura ${tour.code}`, `${text}\nDecide aici: ${site.url}/admin/livrari/${tour.id}#prelungiri`);
  await notifyFarm(tour.farmSlug, `Curierul cere prelungirea turei ${tour.code}`, `${text}\nDecizia o ia administratorul Puii mei.`);
}

/** Doar adminul aprobă sau respinge prelungirile. */
export async function decideExtension(tourId: string, extId: string, approve: boolean, hours: number, comment: string, user: User) {
  if (user.role !== "admin") throw new Error("Neautorizat");
  const tour = await tourRepository.byId(tourId);
  const ext = tour?.extensions.find((e) => e.id === extId);
  if (!tour || !ext || ext.status !== "asteapta") throw new Error("Cererea nu mai este valabilă");
  const decided = { ...ext, status: approve ? ("aprobata" as const) : ("respinsa" as const), hours: approve ? hours : 0, decidedAt: new Date().toISOString(), decidedBy: user.name, comment };
  await tourRepository.update(tour.id, { extensions: tour.extensions.map((e) => (e.id === extId ? decided : e)) });
  await log(tour, "prelungire", actorOf(user), approve ? `Prelungire aprobată: +${hours} ore. ${comment}` : `Prelungire respinsă. ${comment}`);
}

/* ------------------------------------------------------------------ */
/* Clientul                                                           */
/* ------------------------------------------------------------------ */

export async function openRating(parcel: Parcel) {
  if (parcel.ratingToken) return parcel;
  const patch = { ratingToken: newToken(), ratingExpiresAt: new Date(Date.now() + DELIVERY.ratingDays * 86400_000).toISOString() };
  return (await parcelRepository.update(parcel.id, patch)) ?? { ...parcel, ...patch };
}

export async function logClientConfirmation(parcel: Parcel, ok: boolean) {
  if (!parcel.tourId) return;
  const tour = await tourRepository.byId(parcel.tourId);
  if (tour) await log(tour, "confirmare-client", "Client", `Clientul a confirmat primirea coletului ${parcel.preorderNumber}: ${ok ? "în condițiile promise" : "PROBLEMĂ semnalată"}.`, { alert: !ok });
}
