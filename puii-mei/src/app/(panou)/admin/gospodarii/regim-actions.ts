"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DEFAULT_LIMITS, type FarmGovernance, type FarmStanding, standingLabels } from "@/lib/governance";
import { site } from "@/lib/site";
import { requireAdmin } from "@/server/auth";
import { notifyFarm } from "@/server/notifications";
import { farmRepository } from "@/server/repositories/catalog";
import { governanceRepository } from "@/server/repositories/governance";
import { userRepository } from "@/server/repositories/users";
import { landRepository } from "@/server/repositories/land";
import { pensForArea, GROWTH } from "@/lib/growth";
import { processWaitingPreorders } from "@/server/allocation";
import { auditedAction } from "@/server/audit";

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const page = (slug: string, q: string) => `/admin/gospodarii/${encodeURIComponent(slug)}/regim?${q}`;

async function current(slug: string): Promise<FarmGovernance> {
  return (await governanceRepository.bySlug(slug)) ?? { id: slug, standing: "activa", events: [] };
}

const refresh = () => {
  revalidatePath("/", "layout");
};

/** Limite proprii pe gospodărie (gol = limita implicită), cu motivul lor. */
async function saveLimitsAction__impl(formData: FormData) {
  const admin = await requireAdmin();
  const slug = t(formData, "slug");
  if (!(await farmRepository.bySlug(slug, { includeInactive: true }))) redirect("/admin/gospodarii");
  const num = (k: string) => (t(formData, k) ? Math.round(Number(t(formData, k))) : undefined);
  const perYear = num("birdsPerYear");
  const perLot = num("birdsPerLot");
  const reason = t(formData, "limitReason");
  if ((perYear !== undefined && !(perYear >= 0 && perYear <= DEFAULT_LIMITS.birdsPerYear)) || (perLot !== undefined && !(perLot >= 0 && perLot <= 5000))) {
    redirect(page(slug, `eroare=${encodeURIComponent(`Limita anuală: între 0 și ${DEFAULT_LIMITS.birdsPerYear}; limita pe lot: între 0 și 5000.`)}`));
  }
  if ((perYear !== undefined || perLot !== undefined) && reason.length < 3) {
    redirect(page(slug, `eroare=${encodeURIComponent("Scrie motivul limitei (ex. suprafață insuficientă).")}`));
  }
  const g = await current(slug);
  await governanceRepository.save({
    ...g,
    birdsPerYear: perYear,
    birdsPerLot: perLot,
    limitReason: perYear !== undefined || perLot !== undefined ? reason : undefined,
    events: [
      ...g.events,
      {
        at: new Date().toISOString(),
        by: `${admin.name} (admin)`,
        action: `Limite: ${perYear ?? `${DEFAULT_LIMITS.birdsPerYear} (implicit)`} / an, ${perLot ?? `${DEFAULT_LIMITS.birdsPerLot} (implicit)`} / lot`,
        reason: reason || "Revenire la limitele implicite",
      },
    ],
  });
  refresh();
  redirect(page(slug, "salvat=1"));
}

/** Avertizare, suspendare, excludere sau reactivare, cu motiv obligatoriu. */
async function setStandingAction__impl(formData: FormData) {
  const admin = await requireAdmin();
  const slug = t(formData, "slug");
  const farm = await farmRepository.bySlug(slug, { includeInactive: true });
  if (!farm) redirect("/admin/gospodarii");
  const standing = t(formData, "standing") as FarmStanding;
  const reason = t(formData, "reason");
  if (!(standing in standingLabels)) redirect(page(slug, "eroare=Stare%20invalid%C4%83"));
  if (reason.length < 5) redirect(page(slug, `eroare=${encodeURIComponent("Scrie motivul (minimum 5 caractere); rămâne în istoric și îl vede gospodarul.")}`));
  const g = await current(slug);
  const previous = g.standing;

  // Efectele excluderii / reactivării: vizibilitatea pe site și conturile gospodarilor.
  const users = (await userRepository.byFarm(slug)).filter((u) => u.role === "gospodar");
  if (standing !== previous) {
    await notifyFarm(
      slug,
      `Gospodăria ${farm.name}: ${standingLabels[standing]}`,
      `Starea gospodăriei în platforma Puii mei: ${standingLabels[standing]}.\nMotiv: ${reason}\n${site.url}/cont/gospodar`,
    );
  }
  if (standing === "exclusa") {
    if (farm.active) await farmRepository.setActive(farm, false);
    for (const u of users) {
      if (u.status !== "dezactivat") await userRepository.update(u.id, { status: "dezactivat", sessionVersion: u.sessionVersion + 1 });
    }
  } else if (previous === "exclusa") {
    if (!farm.active) await farmRepository.setActive(farm, true);
    for (const u of users) {
      if (u.status === "dezactivat") await userRepository.update(u.id, { status: u.passwordHash ? "activ" : "invitat", sessionVersion: u.sessionVersion + 1 });
    }
  }

  await governanceRepository.save({
    ...g,
    standing,
    standingReason: reason,
    events: [...g.events, { at: new Date().toISOString(), by: `${admin.name} (admin)`, action: `Stare: ${standingLabels[standing]}`, reason }],
  });
  refresh();
  redirect(page(slug, "salvat=1"));
}

/** Adminul confirmă suprafața măsurată în teren (sau o corectează) și, opțional, permite loturi simultane. */
async function verifyLandAction__impl(formData: FormData) {
  const admin = await requireAdmin();
  const slug = t(formData, "slug");
  const m2 = Math.round(Number(t(formData, "verifiedM2").replace(",", ".")));
  if (!(m2 >= 0 && m2 <= 1_000_000)) redirect(page(slug, `eroare=${encodeURIComponent("Suprafața nu e validă.")}`));
  const land = (await landRepository.bySlug(slug)) ?? { id: slug };
  await landRepository.save({ ...land, id: slug, verifiedM2: m2 || undefined, verifiedAt: new Date().toISOString(), verifiedBy: `${admin.name} (admin)`, note: t(formData, "note") || undefined });
  const g = await current(slug);
  const concurrent = formData.get("allowConcurrentLots") === "on";
  const pens = pensForArea(m2);
  await governanceRepository.save({
    ...g,
    allowConcurrentLots: concurrent,
    events: [
      ...g.events,
      {
        at: new Date().toISOString(),
        by: `${admin.name} (admin)`,
        action: `Suprafață confirmată: ${m2} m² ⇒ ${pens} țarcuri × ${GROWTH.birdsPerPen} = ${pens * GROWTH.birdsPerPen} pui / lot${concurrent ? " · loturi simultane permise" : ""}`,
        reason: t(formData, "note") || "Măsurată în teren",
      },
    ],
  });
  await processWaitingPreorders();
  refresh();
  redirect(page(slug, "salvat=1"));
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const saveLimitsAction = auditedAction({ action: "admin.regim.saveLimits", workspace: "admin", resourceType: "regim", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, saveLimitsAction__impl);
export const setStandingAction = auditedAction({ action: "admin.regim.setStanding", workspace: "admin", resourceType: "regim", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, setStandingAction__impl);
export const verifyLandAction = auditedAction({ action: "admin.regim.verifyLand", workspace: "admin", resourceType: "regim", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, verifyLandAction__impl);
