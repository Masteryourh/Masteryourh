"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { DocumentCategory, InvestmentStatus } from "@/lib/domain";
import { documentCategoryLabels, investmentStatusLabels } from "@/lib/documents";
import { site } from "@/lib/site";
import { requireAdmin } from "@/server/auth";
import { sendEmail } from "@/server/email";
import { documentRepository, investmentRepository, saveUpload } from "@/server/repositories/documents";
import { userRepository } from "@/server/repositories/users";

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/cont/investitor", "layout");
};

async function notifyInvestor(investorId: string, subject: string, text: string) {
  const u = await userRepository.byId(investorId);
  if (u?.email) await sendEmail({ to: u.email, subject, text: `${text}\n\n${site.url}/cont/investitor`, html: `<p>${text}</p><p><a href="${site.url}/cont/investitor">Contul tău</a></p>` });
}

export async function createInvestmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const investorId = t(formData, "investorId");
  const investor = await userRepository.byId(investorId);
  const amount = Math.round(Number(t(formData, "amount").replace(",", ".")) * 100) / 100;
  const date = t(formData, "date");
  const title = t(formData, "title");
  let error = "";
  if (!investor || investor.role !== "investitor") error = "Alege investitorul.";
  else if (title.length < 3) error = "Scrie obiectul investiției.";
  else if (!(amount > 0)) error = "Suma trebuie să fie mai mare decât 0.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) error = "Alege data.";
  if (error) redirect(`/admin/investitii?eroare=${encodeURIComponent(error)}`);
  const status = (t(formData, "status") || "propusa") as InvestmentStatus;
  const inv = await investmentRepository.create({
    investorId,
    title,
    description: t(formData, "description"),
    amount,
    date,
    status: status in investmentStatusLabels ? status : "propusa",
    farmSlug: t(formData, "farmSlug") || undefined,
    terms: t(formData, "terms"),
    events: [{ at: new Date().toISOString(), date, title: "Investiție înregistrată", text: title, by: `${admin.name} (admin)` }],
    createdBy: `${admin.name} (admin)`,
  });
  await notifyInvestor(investorId, "Investiție nouă în contul Puii mei", `A fost înregistrată investiția „${title}”.`);
  refresh();
  redirect(`/admin/investitii/${inv.id}?salvat=1`);
}

export async function updateInvestmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const inv = await investmentRepository.get(t(formData, "id"));
  if (!inv) redirect("/admin/investitii");
  const status = t(formData, "status") as InvestmentStatus;
  const patch: Parameters<typeof investmentRepository.update>[1] = {
    title: t(formData, "title") || inv.title,
    description: t(formData, "description"),
    terms: t(formData, "terms"),
    farmSlug: t(formData, "farmSlug") || undefined,
  };
  if (status in investmentStatusLabels && status !== inv.status) {
    patch.status = status;
    patch.events = [
      ...inv.events,
      { at: new Date().toISOString(), date: new Date().toISOString().slice(0, 10), title: `Status: ${investmentStatusLabels[status]}`, text: "", by: `${admin.name} (admin)` },
    ];
    await notifyInvestor(inv.investorId, `Investiția „${inv.title}”: ${investmentStatusLabels[status]}`, `Statusul investiției „${inv.title}” este acum: ${investmentStatusLabels[status]}.`);
  }
  await investmentRepository.update(inv.id, patch);
  refresh();
  redirect(`/admin/investitii/${inv.id}?salvat=1`);
}

/** Eveniment în cronologia investiției (ex. „Adăpost finalizat”, „Raport trimestrial”). */
export async function addInvestmentEventAction(formData: FormData) {
  const admin = await requireAdmin();
  const inv = await investmentRepository.get(t(formData, "id"));
  if (!inv) redirect("/admin/investitii");
  const title = t(formData, "title");
  const date = t(formData, "date");
  if (title.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await investmentRepository.update(inv.id, {
      events: [...inv.events, { at: new Date().toISOString(), date, title, text: t(formData, "text"), by: `${admin.name} (admin)` }],
    });
    await notifyInvestor(inv.investorId, `Noutate: ${title}`, `${title}${t(formData, "text") ? ` – ${t(formData, "text")}` : ""} (investiția „${inv.title}”).`);
  }
  refresh();
  redirect(`/admin/investitii/${inv.id}?salvat=1#cronologie`);
}

/** Contract, act adițional, raport: atașat investiției, vizibil investitorului. */
export async function uploadInvestmentDocumentAction(formData: FormData) {
  const admin = await requireAdmin();
  const inv = await investmentRepository.get(t(formData, "id"));
  if (!inv) redirect("/admin/investitii");
  let error = "";
  try {
    const category = (t(formData, "category") || "contract") as DocumentCategory;
    const title = t(formData, "title");
    if (title.length < 3) throw new Error("Scrie titlul documentului.");
    const date = t(formData, "date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Alege data documentului.");
    const file = await saveUpload(formData.get("file") as File, `${admin.name} (admin)`);
    await documentRepository.create({
      investmentId: inv.id,
      farmSlug: inv.farmSlug,
      category: category in documentCategoryLabels ? category : "altele",
      title,
      number: t(formData, "number") || undefined,
      date,
      fileId: file.id,
      fileName: file.name,
      mime: file.mime,
      size: file.size,
      sha256: file.sha256,
      uploadedBy: `${admin.name} (admin)`,
    });
    await notifyInvestor(inv.investorId, `Document nou: ${title}`, `Un document nou („${title}”) a fost adăugat la investiția „${inv.title}”.`);
  } catch (err) {
    error = err instanceof Error ? err.message : "Nu s-a putut salva.";
  }
  refresh();
  redirect(`/admin/investitii/${inv.id}?${error ? `eroare=${encodeURIComponent(error)}` : "salvat=1"}#documente`);
}
