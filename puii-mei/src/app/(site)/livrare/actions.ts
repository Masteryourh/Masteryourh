"use server";

import { revalidatePath } from "next/cache";
import { PHOTO_SIDES, extensionReasons, vehicleTypes } from "@/lib/delivery";
import type { Tour } from "@/lib/domain";
import { courierAuthorized, grantCourier, pendingRequestId, rememberPinRequest } from "@/server/courier-session";
import {
  type DriverData,
  deliverParcel,
  finishTour,
  loadParcel,
  loginWithPersonalPin,
  pairByApprovedRequest,
  pairWithPickupPin,
  requestExtension,
  requestPin,
  setPersonalPin,
  startTour,
} from "@/server/delivery";
import { parcelRepository, photoRepository, tourRepository } from "@/server/repositories/delivery";
import { auditedAction } from "@/server/audit";

export type CourierState = { status: "idle" } | { status: "error"; error?: string; errors: Record<string, string> } | { status: "ok" };

const MAX_PHOTO = 1.5 * 1024 * 1024;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const fail = (errors: Record<string, string>, error?: string): CourierState => ({ status: "error", errors, error });

function num(fd: FormData, k: string, errors: Record<string, string>, label: string, min = -50, max = 1_000_000) {
  const raw = str(fd, k).replace(",", ".");
  const v = Number(raw);
  if (!raw || !Number.isFinite(v) || v < min || v > max) {
    errors[k] = `Completează ${label}.`;
    return 0;
  }
  return v;
}

function photo(fd: FormData, k: string, errors: Record<string, string>, label = "fotografia") {
  const f = fd.get(k);
  if (!(f instanceof File) || f.size === 0) errors[k] = `Adaugă ${label}.`;
  else if (!f.type.startsWith("image/")) errors[k] = "Fișierul trebuie să fie o imagine.";
  else if (f.size > MAX_PHOTO) errors[k] = "Imaginea este prea mare.";
  else return f;
  return null;
}

function gps(fd: FormData) {
  const lat = Number(str(fd, "lat"));
  const lng = Number(str(fd, "lng"));
  const accuracy = Number(str(fd, "accuracy"));
  return str(fd, "lat") && Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng, ...(Number.isFinite(accuracy) ? { accuracy } : {}) }
    : {};
}

function driver(fd: FormData, errors: Record<string, string>): DriverData {
  const d = {
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    plate: str(fd, "plate").toUpperCase(),
    vehicleType: str(fd, "vehicleType"),
    atp: str(fd, "atp"),
  };
  if (d.name.length < 3) errors.name = "Completează numele.";
  if (!/^(\+40|0)\d{9}$/.test(d.phone.replace(/[\s.-]/g, ""))) errors.phone = "Completează un telefon valid.";
  if (d.plate.length < 5) errors.plate = "Completează numărul de înmatriculare.";
  if (!vehicleTypes.includes(d.vehicleType as (typeof vehicleTypes)[number])) errors.vehicleType = "Alege tipul mașinii.";
  if (d.atp.length < 3) errors.atp = "Completează seria certificatului ATP.";
  return d;
}

async function authorizedTour(token: string): Promise<Tour | null> {
  const tour = await tourRepository.byToken(token);
  return tour && (await courierAuthorized(tour)) ? tour : null;
}

const refresh = (tour: Tour) => {
  revalidatePath(`/livrare/${tour.token}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/cont/gospodar", "layout");
};

/* --------------------------- acces --------------------------- */

async function pairAction__impl(token: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const tour = await tourRepository.byToken(token);
  if (!tour) return fail({}, "Tura nu există.");
  const errors: Record<string, string> = {};
  const d = driver(fd, errors);
  const pin = str(fd, "pin");
  if (!/^\d{4}$/.test(pin)) errors.pin = "PIN-ul are 4 cifre.";
  if (Object.keys(errors).length) return fail(errors);
  const res = await pairWithPickupPin(tour, pin, d);
  if (!res.ok) return fail({}, res.error);
  await grantCourier(res.tour, res.tour.courier!.sessionVersion);
  refresh(tour);
  return { status: "ok" };
}

async function requestPinAction__impl(token: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const tour = await tourRepository.byToken(token);
  if (!tour) return fail({}, "Tura nu există.");
  if (tour.courier?.personalPinHash) return fail({}, "Tura are deja un curier.");
  const errors: Record<string, string> = {};
  const d = driver(fd, errors);
  if (Object.keys(errors).length) return fail(errors);
  const req = await requestPin(tour, d);
  await rememberPinRequest(tour, req.id);
  refresh(tour);
  return { status: "ok" };
}

/** Verificat periodic de pagina curierului cât așteaptă confirmarea gospodarului. */
export async function checkPinRequest(token: string): Promise<"asteapta" | "aprobata" | "respinsa" | "lipsa"> {
  const tour = await tourRepository.byToken(token);
  const rid = tour ? await pendingRequestId(tour) : null;
  if (!tour || !rid || tour.pinRequest?.id !== rid) return tour?.courier && rid ? "aprobata" : "lipsa";
  if (tour.pinRequest.status === "aprobata") {
    const paired = await pairByApprovedRequest(tour, rid);
    if (paired?.courier) {
      await grantCourier(paired, paired.courier.sessionVersion);
      refresh(tour);
    }
  }
  return tour.pinRequest.status;
}

async function setPinAction__impl(token: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const tour = await authorizedTour(token);
  if (!tour) return fail({}, "Sesiunea a expirat. Deschide din nou linkul turei.");
  const pin = str(fd, "pin");
  if (!/^\d{4}$/.test(pin)) return fail({ pin: "PIN-ul are 4 cifre." });
  if (pin !== str(fd, "confirm")) return fail({ confirm: "PIN-urile nu coincid." });
  await setPersonalPin(tour, pin);
  refresh(tour);
  return { status: "ok" };
}

async function pinLoginAction__impl(token: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const tour = await tourRepository.byToken(token);
  if (!tour) return fail({}, "Tura nu există.");
  const res = await loginWithPersonalPin(tour, str(fd, "pin"));
  if (!res.ok) {
    refresh(tour);
    return fail({}, res.error);
  }
  await grantCourier(tour, res.sessionVersion);
  refresh(tour);
  return { status: "ok" };
}

/* --------------------------- traseu --------------------------- */

async function startAction__impl(token: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const tour = await authorizedTour(token);
  if (!tour) return fail({}, "Sesiunea a expirat. Deschide din nou linkul turei.");
  const errors: Record<string, string> = {};
  const odometer = num(fd, "odometer", errors, "kilometrajul", 0);
  const compartmentTemp = num(fd, "compartmentTemp", errors, "temperatura", -30, 40);
  const odo = photo(fd, "odometerPhoto", errors, "fotografia bordului");
  const plate = photo(fd, "platePhoto", errors, "fotografia plăcuței");
  const temp = photo(fd, "tempPhoto", errors, "fotografia termometrului");
  if (fd.get("hygieneOk") !== "on") errors.hygieneOk = "Confirmă verificarea igienei compartimentului.";
  if (Object.keys(errors).length) return fail(errors);
  const owner = `tour:${tour.id}`;
  try {
    await startTour(tour, {
      odometer,
      compartmentTemp,
      hygieneOk: true,
      odometerPhotoId: await photoRepository.save(odo!, owner),
      platePhotoId: await photoRepository.save(plate!, owner),
      tempPhotoId: await photoRepository.save(temp!, owner),
      ...gps(fd),
    });
  } catch (e) {
    return fail({}, (e as Error).message);
  }
  refresh(tour);
  return { status: "ok" };
}

async function parcelForCourier(courierToken: string) {
  const parcel = await parcelRepository.byCourierToken(courierToken);
  const tour = parcel?.tourId ? await tourRepository.byId(parcel.tourId) : null;
  if (!parcel || !tour || !(await courierAuthorized(tour))) return null;
  return { parcel, tour };
}

async function loadAction__impl(courierToken: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const ctx = await parcelForCourier(courierToken);
  if (!ctx) return fail({}, "Sesiunea a expirat. Deschide din nou linkul turei.");
  const errors: Record<string, string> = {};
  const temp = num(fd, "temp", errors, "temperatura mărfii", -30, 40);
  const files = PHOTO_SIDES.map((side, i) => photo(fd, `photo${i + 1}`, errors, `fotografia (${side.toLowerCase()})`));
  if (Object.keys(errors).length) return fail(errors);
  const owner = `parcel:${ctx.parcel.id}`;
  const photoIds: string[] = [];
  for (const f of files) photoIds.push(await photoRepository.save(f!, owner));
  try {
    await loadParcel(ctx.tour, ctx.parcel, { temp, photoIds, ...gps(fd) });
  } catch (e) {
    return fail({}, (e as Error).message);
  }
  refresh(ctx.tour);
  revalidatePath(`/livrare/c/${courierToken}`);
  return { status: "ok" };
}

async function deliverAction__impl(courierToken: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const ctx = await parcelForCourier(courierToken);
  if (!ctx) return fail({}, "Sesiunea a expirat. Deschide din nou linkul turei.");
  const errors: Record<string, string> = {};
  const temp = num(fd, "temp", errors, "temperatura", -30, 40);
  const tempFile = photo(fd, "tempPhoto", errors, "fotografia termometrului");
  const sig = photo(fd, "signature", errors, "semnătura clientului");
  if (Object.keys(errors).length) return fail(errors);
  const owner = `parcel:${ctx.parcel.id}`;
  try {
    await deliverParcel(ctx.tour, ctx.parcel, {
      temp,
      tempPhotoId: await photoRepository.save(tempFile!, owner),
      signaturePhotoId: await photoRepository.save(sig!, owner),
      ...gps(fd),
    });
  } catch (e) {
    return fail({}, (e as Error).message);
  }
  refresh(ctx.tour);
  revalidatePath(`/livrare/c/${courierToken}`);
  return { status: "ok" };
}

async function finishAction__impl(token: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const tour = await authorizedTour(token);
  if (!tour) return fail({}, "Sesiunea a expirat. Deschide din nou linkul turei.");
  const errors: Record<string, string> = {};
  const odometer = num(fd, "odometer", errors, "kilometrajul", tour.start?.odometer ?? 0);
  const odo = photo(fd, "odometerPhoto", errors, "fotografia bordului");
  if (Object.keys(errors).length) return fail(errors);
  try {
    await finishTour(tour, {
      odometer,
      odometerPhotoId: await photoRepository.save(odo!, `tour:${tour.id}`),
      note: str(fd, "note"),
      ...gps(fd),
    });
  } catch (e) {
    return fail({ note: (e as Error).message });
  }
  refresh(tour);
  return { status: "ok" };
}

async function extensionAction__impl(token: string, _p: CourierState, fd: FormData): Promise<CourierState> {
  const tour = await authorizedTour(token);
  if (!tour) return fail({}, "Sesiunea a expirat. Deschide din nou linkul turei.");
  const errors: Record<string, string> = {};
  const reason = str(fd, "reason");
  const description = str(fd, "description");
  if (!extensionReasons.includes(reason as (typeof extensionReasons)[number])) errors.reason = "Alege motivul.";
  if (description.length < 10) errors.description = "Descrie situația (cel puțin 10 caractere).";
  const proof = photo(fd, "proof", errors, "fotografia doveditoare");
  if (Object.keys(errors).length) return fail(errors);
  try {
    await requestExtension(tour, {
      reason,
      description,
      photoId: await photoRepository.save(proof!, `tour:${tour.id}`),
      ...gps(fd),
    });
  } catch (e) {
    return fail({}, (e as Error).message);
  }
  refresh(tour);
  return { status: "ok" };
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const pairAction = auditedAction({ action: "courier.livrare.pair", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, pairAction__impl);
export const requestPinAction = auditedAction({ action: "courier.livrare.requestPin", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, requestPinAction__impl);
export const setPinAction = auditedAction({ action: "courier.livrare.setPin", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, setPinAction__impl);
export const pinLoginAction = auditedAction({ action: "courier.livrare.pinLogin", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, pinLoginAction__impl);
export const startAction = auditedAction({ action: "courier.livrare.start", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, startAction__impl);
export const loadAction = auditedAction({ action: "courier.livrare.load", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, loadAction__impl);
export const deliverAction = auditedAction({ action: "courier.livrare.deliver", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, deliverAction__impl);
export const finishAction = auditedAction({ action: "courier.livrare.finish", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, finishAction__impl);
export const extensionAction = auditedAction({ action: "courier.livrare.extension", workspace: "courier", resourceType: "livrare", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, extensionAction__impl);
