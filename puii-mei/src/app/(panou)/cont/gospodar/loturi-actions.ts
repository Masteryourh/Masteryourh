"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Species } from "@/lib/products";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { lotRepository } from "@/server/repositories/catalog";
import { governanceRepository } from "@/server/repositories/governance";
import { checkLotLimits } from "@/lib/governance";
import { GROWTH, lotPens, overlapError, penView } from "@/lib/growth";
import { landRepository } from "@/server/repositories/land";
import { processWaitingPreorders } from "@/server/allocation";
import { notifyAdmins, notifyFarm } from "@/server/notifications";
import { site } from "@/lib/site";

const SPECIES: Species[] = ["pui", "curcani", "rate", "fazani"];

const refresh = () => {
  for (const p of ["/", "/precomanda", "/trasabilitate", "/gospodarii"]) revalidatePath(p, "layout");
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
};

function back(formData: FormData, params: string) {
  const to = String(formData.get("inapoi") ?? "/cont/gospodar");
  const safe = to.startsWith("/admin") || to.startsWith("/cont/gospodar") ? to : "/cont/gospodar";
  return `${safe}${safe.includes("?") ? "&" : "?"}${params}#loturi`;
}

function readLot(formData: FormData) {
  const n = (k: string) => Number(String(formData.get(k) ?? "").replace(",", "."));
  const t = (k: string) => String(formData.get(k) ?? "").trim();
  const species = t("species") as Species;
  return {
    species: SPECIES.includes(species) ? species : "pui",
    breed: t("breed") || "Pui cu creștere lentă (hibrid de exterior)",
    startDate: t("startDate"),
    growthDays: Math.round(n("growthDays")) || GROWTH.growthDays,
    pens: Math.round(n("pens")) || undefined,
    totalBirds: Math.round(n("pens")) ? Math.round(n("pens")) * GROWTH.birdsPerPen : Math.round(n("totalBirds")),
    feed: t("feed") || "Furaje din cereale",
    processor: t("processor") || "Sacrificare tradițională în gospodăria de creștere",
    notes: t("notes"),
  };
}

function validate(d: ReturnType<typeof readLot>) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.startDate)) return "Alege data de început a lotului.";
  if (!(d.growthDays >= 30 && d.growthDays <= 200)) return "Durata creșterii trebuie să fie între 30 și 200 de zile.";
  if (!(d.totalBirds >= GROWTH.birdsPerPen && d.totalBirds <= 10000)) return `Lotul are cel puțin un țarc (${GROWTH.birdsPerPen} de pui).`;
  return "";
}

/** Lot nou (gospodarul pentru gospodăria lui, adminul pentru oricare). */
export async function createLotAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = String(formData.get("farmSlug") ?? "");
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  const data = readLot(formData);
  const [farmLots, gov, land] = await Promise.all([
    lotRepository.byFarm(farmSlug, { all: true }),
    governanceRepository.bySlug(farmSlug),
    landRepository.bySlug(farmSlug),
  ]);
  const blocked = gov?.standing === "suspendata" || gov?.standing === "exclusa" ? `Gospodăria e ${gov.standing === "exclusa" ? "exclusă" : "suspendată"}: nu se pot crea loturi noi.` : "";
  const error = blocked || validate(data) || checkLotLimits(farmLots, gov, data, land);
  if (error) redirect(back(formData, `eroareLot=${encodeURIComponent(error)}`));
  const needsApproval = user.role !== "admin";
  const lot = await lotRepository.create({ ...data, farmSlug }, `${user.name} (${user.role})`, needsApproval);
  if (needsApproval) {
    await notifyAdmins(
      `Lot nou de aprobat: ${lot.code}`,
      `${user.name} a propus lotul ${lot.code}: ${lot.totalBirds} păsări, start ${lot.startDate}.\n${site.url}/admin/loturi`,
    );
  }
  if (!needsApproval) await processWaitingPreorders();
  refresh();
  redirect(back(formData, `${needsApproval ? "lotPropus" : "lotNou"}=${lot.code}`));
}

/** Modificarea unui lot: număr de păsări, date, închidere / redeschidere pentru precomenzi. */
export async function updateLotAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const code = String(formData.get("code") ?? "");
  const lot = await lotRepository.byCode(code, { all: true });
  if (!lot || !canManageFarm(user, lot.farmSlug)) throw new Error("Neautorizat");
  if (formData.get("toggle") === "1") {
    await lotRepository.update(lot.code, { closed: !lot.closed });
    refresh();
    redirect(back(formData, `lotSalvat=${lot.code}`));
  }
  const data = readLot(formData);
  const [farmLots, gov, land] = await Promise.all([
    lotRepository.byFarm(lot.farmSlug, { all: true }),
    governanceRepository.bySlug(lot.farmSlug),
    landRepository.bySlug(lot.farmSlug),
  ]);
  const error =
    validate(data) ||
    (data.totalBirds < lot.reservedBirds ? `Lotul are deja ${lot.reservedBirds} păsări rezervate.` : "") ||
    (data.totalBirds !== lot.totalBirds || data.startDate !== lot.startDate ? checkLotLimits(farmLots, gov, { ...data, code: lot.code }, land) : "");
  if (error) redirect(back(formData, `eroareLot=${encodeURIComponent(error)}`));
  await lotRepository.update(lot.code, {
    totalBirds: data.totalBirds,
    pens: data.pens,
    // După pornirea primului țarc, data de început e cea reală.
    startDate: lot.penStarts?.length ? lot.startDate : data.startDate,
    growthDays: data.growthDays,
    breed: data.breed,
    feed: data.feed,
    processor: data.processor,
    notes: data.notes,
    // Un lot respins, corectat de gospodar, intră din nou la aprobare.
    ...(lot.approval?.status === "respins" && user.role !== "admin" ? { approval: { status: "asteapta" as const } } : {}),
  });
  await processWaitingPreorders();
  refresh();
  redirect(back(formData, `lotSalvat=${lot.code}`));
}

/** Adminul aprobă sau respinge un lot propus de gospodar. */
export async function decideLotAction(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const lot = await lotRepository.byCode(String(formData.get("code") ?? ""), { all: true });
  if (!lot || lot.approval?.status !== "asteapta") redirect(back(formData, "lotSalvat=1"));
  const approve = formData.get("decision") === "aproba";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!approve && reason.length < 3) redirect(back(formData, `eroareLot=${encodeURIComponent("Scrie motivul respingerii.")}`));
  await lotRepository.update(lot.code, {
    approval: { status: approve ? "aprobat" : "respins", by: `${admin.name} (admin)`, at: new Date().toISOString(), ...(approve ? {} : { reason }) },
  });
  await notifyFarm(
    lot.farmSlug,
    approve ? `Lotul ${lot.code} a fost aprobat` : `Lotul ${lot.code} a fost respins`,
    approve
      ? `Lotul ${lot.code} a fost aprobat și apare acum la precomandă.\n${site.url}/cont/gospodar`
      : `Lotul ${lot.code} nu a fost aprobat. Motiv: ${reason}\n${site.url}/cont/gospodar`,
  );
  if (approve) await processWaitingPreorders();
  refresh();
  redirect(back(formData, `lotSalvat=${lot.code}`));
}

/**
 * Pornirea unui țarc: puii de o zi au intrat în gospodărie. Se poate doar când țarcul e plin
 * (40 de precomenzi) și în fereastra de 7 zile de la primul țarc al lotului.
 */
export async function startPenAction(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const lot = await lotRepository.byCode(String(formData.get("code") ?? ""), { all: true });
  if (!lot || !canManageFarm(user, lot.farmSlug)) throw new Error("Neautorizat");
  const n = Number(formData.get("pen"));
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const pen = penView(lot).find((p) => p.n === n);
  let error = "";
  if (!pen || n < 1 || n > lotPens(lot)) error = "Țarc inexistent.";
  else if (pen.state === "pornit") error = `Țarcul ${n} a pornit deja.`;
  else if (pen.state === "inchis") error = "Fereastra de 7 zile pentru pornirea țarcurilor acestui lot a trecut.";
  else if (pen.birds < GROWTH.birdsPerPen && user.role !== "admin") error = `Țarcul ${n} are ${pen.birds} / ${GROWTH.birdsPerPen} pui rezervați; pornește când e plin.`;
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) error = "Data nu e validă.";
  else if (!lot.penStarts?.length) {
    // Primul țarc fixează data reală a lotului: tot un lot pe rând în gospodărie.
    const [farmLots, gov] = await Promise.all([lotRepository.byFarm(lot.farmSlug, { all: true }), governanceRepository.bySlug(lot.farmSlug)]);
    if (!gov?.allowConcurrentLots) error = overlapError(farmLots, date, lot.code);
  }
  if (error) redirect(back(formData, `eroareLot=${encodeURIComponent(error)}`));
  const starts = [...(lot.penStarts ?? []), { n, date, at: new Date().toISOString(), by: `${user.name} (${user.role})` }].sort((a, b) => a.n - b.n);
  await lotRepository.update(lot.code, { penStarts: starts, ...(starts.length === 1 ? { startDate: date } : {}) });
  refresh();
  redirect(back(formData, `lotSalvat=${lot.code}`));
}
