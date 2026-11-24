"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { canManageFarm } from "@/server/delivery";
import { notifyAdmins } from "@/server/notifications";
import { documentRepository, saveUpload } from "@/server/repositories/documents";
import { landRepository } from "@/server/repositories/land";
import { site } from "@/lib/site";
import { auditedAction } from "@/server/audit";

/**
 * Gospodarul declară suprafața verde pentru creștere și încarcă actul de proprietate / folosință.
 * Puii mei o măsoară în teren și o confirmă; abia atunci se pot crea loturi.
 */
async function declareLandAction__impl(formData: FormData) {
  const user = await requireRole(["gospodar"]);
  const farmSlug = String(formData.get("farmSlug") ?? "");
  if (!canManageFarm(user, farmSlug)) throw new Error("Neautorizat");
  const back = `/cont/gospodar${user.role === "admin" ? `?gospodarie=${encodeURIComponent(farmSlug)}&` : "?"}`;
  const m2 = Math.round(Number(String(formData.get("declaredM2") ?? "").replace(",", ".")));
  let error = "";
  let proofDocumentId: string | undefined;
  try {
    if (!(m2 >= 50 && m2 <= 1_000_000)) throw new Error("Scrie suprafața în metri pătrați (ex. 900).");
    const upload = formData.get("file") as File | null;
    const existing = await landRepository.bySlug(farmSlug);
    if (upload && upload.size > 0) {
      const file = await saveUpload(upload, `${user.name} (${user.role})`);
      const doc = await documentRepository.create({
        farmSlug,
        category: "proprietate",
        title: `Act de proprietate / folosință – suprafață pentru creștere (${m2} m²)`,
        date: new Date().toISOString().slice(0, 10),
        fileId: file.id,
        fileName: file.name,
        mime: file.mime,
        size: file.size,
        sha256: file.sha256,
        uploadedBy: `${user.name} (${user.role})`,
      });
      proofDocumentId = doc.id;
    } else if (!existing?.proofDocumentId) {
      throw new Error("Atașează actul de proprietate sau de folosință al suprafeței.");
    }
    await landRepository.save({
      ...(existing ?? { id: farmSlug }),
      id: farmSlug,
      declaredM2: m2,
      proofDocumentId: proofDocumentId ?? existing?.proofDocumentId,
      declaredAt: new Date().toISOString(),
      declaredBy: `${user.name} (${user.role})`,
    });
    await notifyAdmins(`Suprafață de confirmat: ${farmSlug}`, `${user.name} a declarat ${m2} m² pentru creștere.\n${site.url}/admin/gospodarii/${farmSlug}/regim`);
  } catch (err) {
    error = err instanceof Error ? err.message : "Nu s-a putut salva.";
  }
  revalidatePath("/cont/gospodar", "layout");
  revalidatePath("/admin", "layout");
  redirect(`${back}${error ? `eroareTeren=${encodeURIComponent(error)}` : "salvatTeren=1"}#teren`);
}

/* AUD-001: fiecare acțiune lasă un eveniment de audit, în aceeași tranzacție cu modificarea. */
export const declareLandAction = auditedAction({ action: "household.teren.declareLand", workspace: "household", resourceType: "teren", fields: ["status", "lotCode", "reason", "decision", "category", "title", "amount", "date", "mode", "received", "choice", "declaredM2", "totalBirds", "startDate", "role", "standing", "kind", "pen", "type", "hours", "how"] }, declareLandAction__impl);
