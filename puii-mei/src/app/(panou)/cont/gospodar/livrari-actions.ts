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

const refresh = () => {
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
};

/** Generează (sau regenerează) eticheta unei comenzi și deschide pagina de tipărire. */
export async function generateLabelAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const id = String(formData.get("id") ?? "");
  await generateLabel(id, user, { regenerate: formData.get("regenerate") === "1" });
  refresh();
  redirect(`/cont/gospodar/etichete?ids=${encodeURIComponent(id)}`);
}

export type TourFormState = { status: "idle" } | { status: "error"; error: string };

export async function createTourAction(_p: TourFormState, formData: FormData): Promise<TourFormState> {
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
export async function routeAction(formData: FormData) {
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

export async function cancelTourAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  await cancelTour(String(formData.get("tourId") ?? ""), user);
  refresh();
}

export async function pinRequestAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  await decidePinRequest(
    String(formData.get("tourId") ?? ""),
    String(formData.get("requestId") ?? ""),
    formData.get("decision") === "confirm",
    user,
  );
  refresh();
}

export async function courierAccessAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const mode = formData.get("mode") === "resetare" ? "resetare" : "deblocare";
  await resetCourierAccess(String(formData.get("tourId") ?? ""), user, mode);
  refresh();
}

/** Doar adminul aprobă prelungirile (verificat și în decideExtension). */
export async function extensionDecisionAction(formData: FormData) {
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
