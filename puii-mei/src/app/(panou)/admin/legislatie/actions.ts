"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { legalKindLabels, type LegalKind } from "@/lib/legal";
import { requireAdmin } from "@/server/auth";
import { legalRepository } from "@/server/repositories/legal";
import { userRepository } from "@/server/repositories/users";
import { sendEmail } from "@/server/email";
import { site } from "@/lib/site";

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function read(formData: FormData) {
  const kind = t(formData, "kind") as LegalKind;
  const url = t(formData, "url");
  const title = t(formData, "title");
  const date = t(formData, "date");
  if (!(kind in legalKindLabels)) return { error: "Alege tipul." };
  if (title.length < 3) return { error: "Scrie titlul." };
  if (!/^https?:\/\/\S+$/.test(url)) return { error: "Linkul trebuie să înceapă cu http:// sau https://." };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Data nu e validă." };
  return { kind, title, url, summary: t(formData, "summary"), date: date || undefined, verified: formData.get("verified") === "on" };
}

const done = (q: string) => {
  revalidatePath("/admin/legislatie");
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/legislatie");
  redirect(`/admin/legislatie?${q}`);
};

export async function createLegalAction(formData: FormData) {
  const admin = await requireAdmin();
  const d = read(formData);
  if ("error" in d) done(`eroare=${encodeURIComponent(d.error!)}`);
  else {
    await legalRepository.create({ ...d, createdBy: `${admin.name} (admin)` });
    if (formData.get("notify") === "on") {
      // Gospodarii activi sunt anunțați pe email (dacă emailul e configurat).
      const farmers = (await userRepository.list()).filter((u) => u.role === "gospodar" && u.status === "activ");
      const text = `${legalKindLabels[d.kind]}: ${d.title}\n\n${d.summary}\n\nSursa: ${d.url}\nToate regulile: ${site.url}/cont/gospodar/legislatie`;
      await Promise.all(farmers.map((u) => sendEmail({ to: u.email, subject: `Puii mei · ${legalKindLabels[d.kind]}: ${d.title}`, text, html: `<p>${text.replace(/\n/g, "<br>")}</p>` })));
    }
    done("salvat=1");
  }
}

export async function updateLegalAction(formData: FormData) {
  await requireAdmin();
  const id = t(formData, "id");
  if (formData.get("archive") === "1" || formData.get("archive") === "0") {
    await legalRepository.update(id, { archived: formData.get("archive") === "1" });
    done("salvat=1");
  }
  const d = read(formData);
  if ("error" in d) done(`eroare=${encodeURIComponent(d.error!)}`);
  else {
    await legalRepository.update(id, d);
    done("salvat=1");
  }
}
