"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import {
  cancelTour,
  createTour,
  decideExtension,
  decidePinRequest,
  generateLabel,
  reorderTour,
  resetCourierAccess,
} from "@/server/delivery";
import { tourRepository } from "@/server/repositories/delivery";
import { auditedAction } from "@/server/audit";

const refresh = () => {
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
};

/** Generează (sau regenerează) eticheta unei comenzi și deschide pagina de tipărire. */
async function generateLabelAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const id = String(formData.get("id") ?? "");
  await generateLabel(id, user, { regenerate: formData.get("regenerate") === "1" });
  refresh();
  redirect(`/cont/gospodar/etichete?ids=${encodeURIComponent(id)}`);
}

export type TourFormState = { status: "idle" } | { status: "error"; error: string };

async function createTourAction__impl(_p: TourFormState, formData: FormData): Promise<TourFormState> {
  const user = await requireRole(["gospodar"]);
  const parcelIds = formData.getAll("parcelIds").map(String).filter(Boolean);
  const date = String(formData.get("date") ?? "");
  const hours = Number(formData.get("durationHours"));
  const farmSlug = String(formData.get("farmSlug") ?? "");
  if (!parcelIds.length) return { status: "error", error: "Alege cel puțin un colet." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: "error", error: "Alege data turei." };
  if (!Number.isFinite(hours) || hours < 1 || hours > 24) return { status: "error", error: "Durata trebuie să fie între 1 și 24 de ore." };
  let id: string;
  try {
    id = (await createTour({ farmSlug, date, parcelIds, durationHours: hours }, user)).id;
  } catch (e) {
    return { status: "error", error: (e as Error).message };
  }
  refresh();
  redirect(`/cont/gospodar/ture/${id}`);
}

/** Mută o oprire în sus/jos sau recalculează traseul optim. */
async function routeAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const tour = await tourRepository.byId(String(formData.get("tourId") ?? ""));
  if (!tour) throw new Error("Tura nu există");
  const how = String(formData.get("how") ?? "");
  if (how === "optim") {
    await reorderTour(tour.id, tour.parcelIds, user, "optim");
  } else {
    const id = String(formData.get("parcelId") ?? "");
    const i = tour.parcelIds.indexOf(id);
    const j = how === "sus" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= tour.parcelIds.length) return;
    const order = [...tour.parcelIds];
    [order[i], order[j]] = [order[j], order[i]];
    await reorderTour(tour.id, order, user, "manual");
  }
  refresh();
}

async function cancelTourAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  await cancelTour(String(formData.get("tourId") ?? ""), user);
  refresh();
}

async function pinRequestAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  await decidePinRequest(
    String(formData.get("tourId") ?? ""),
    String(formData.get("requestId") ?? ""),
    formData.get("decision") === "confirm",
    user,
  );
  refresh();
}

async function courierAccessAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const mode = formData.get("mode") === "resetare" ? "resetare" : "deblocare";
  await resetCourierAccess(String(formData.get("tourId") ?? ""), user, mode);
  refresh();
}

/** Doar adminul aprobă prelungirile (verificat și în decideExtension). */
async function extensionDecisionAction__impl(formData: FormData) {
  const user = await requireRole(["admin"]);
  const approve = formData.get("decision") === "aproba";
  const hours = Math.max(0, Math.min(12, Number(formData.get("hours") ?? 0)));
  await decideExtension(
    String(formData.get("tourId") ?? ""),
    String(formData.get("extId") ?? ""),
    approve,
    approve ? hours || 1 : 0,
    String(formData.get("comment") ?? "").slice(0, 300),
    user,
  );
  refresh();
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const generateLabelAction = auditedAction({ action: "household.livrari.generateLabel", workspace: "household", resourceType: "livrari", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, generateLabelAction__impl);
export const createTourAction = auditedAction({ action: "household.livrari.createTour", workspace: "household", resourceType: "livrari", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, createTourAction__impl);
export const routeAction = auditedAction({ action: "household.livrari.route", workspace: "household", resourceType: "livrari", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, routeAction__impl);
export const cancelTourAction = auditedAction({ action: "household.livrari.cancelTour", workspace: "household", resourceType: "livrari", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, cancelTourAction__impl);
export const pinRequestAction = auditedAction({ action: "household.livrari.pinRequest", workspace: "household", resourceType: "livrari", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, pinRequestAction__impl);
export const courierAccessAction = auditedAction({ action: "household.livrari.courierAccess", workspace: "household", resourceType: "livrari", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, courierAccessAction__impl);
export const extensionDecisionAction = auditedAction({ action: "household.livrari.extensionDecision", workspace: "household", resourceType: "livrari", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, extensionDecisionAction__impl);
