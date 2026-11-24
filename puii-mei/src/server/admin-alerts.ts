import "server-only";
import { tourRepository } from "./repositories/delivery";
import { farmRepository, lotRepository } from "./repositories/catalog";
import { growthLogRepository } from "./repositories/growth-log";
import { growthAlerts } from "@/lib/growth-log";
import { expiringDocuments, reminderText } from "@/lib/document-expiry";
import { documentRepository } from "./repositories/documents";

export interface AdminAlert {
  id: string;
  kind: "prelungire" | "crestere" | "document";
  at: string;
  title: string;
  text: string;
  href: string;
}

/** Ce cere atenția adminului: cereri de prelungire ale curierilor și abateri de la monitorizarea creșterii. */
export async function adminAlerts(): Promise<AdminAlert[]> {
  const [tours, lots, entries, farms] = await Promise.all([tourRepository.list(), lotRepository.list({ all: true }), growthLogRepository.list(), farmRepository.listAll()]);
  const farmName = new Map(farms.map((f) => [f.slug, f.name]));
  const growth: AdminAlert[] = growthAlerts(lots, entries).map((g) => ({
    id: g.id,
    kind: "crestere",
    at: new Date().toISOString().slice(0, 10),
    title: `Monitorizare · lotul ${g.lotCode}`,
    text: `${farmName.get(g.farmSlug) ?? g.farmSlug} (lotul ${g.lotCode}): ${g.text}`,
    href: `/cont/gospodar/jurnal?gospodarie=${g.farmSlug}`,
  }));
  // Documente ale gospodăriilor care expiră în cel mult 30 de zile (sau au expirat): compania anunță gospodarul.
  const docs = expiringDocuments((await documentRepository.list()).filter((d) => d.farmSlug), new Date(), 30).map(({ doc, days }) => ({
    id: `doc-${doc.id}`,
    kind: "document" as const,
    at: doc.expiresOn!,
    title: `Document care expiră · ${farmName.get(doc.farmSlug!) ?? doc.farmSlug}`,
    text: `${farmName.get(doc.farmSlug!) ?? doc.farmSlug}: ${reminderText(doc.title, days)}`,
    href: `/cont/gospodar/documente?gospodarie=${doc.farmSlug}#documente`,
  }));
  return [...docs, ...growth, ...tours
    .flatMap((t) =>
      t.extensions
        .filter((e) => e.status === "asteapta")
        .map((e) => ({
          id: e.id,
          kind: "prelungire" as const,
          at: e.at,
          title: `Cerere de prelungire · tura ${t.code}`,
          text: `${t.courier?.name ?? "Curierul"}: ${e.reason}${e.description ? ` – ${e.description}` : ""}`,
          href: `/admin/livrari/${t.id}#prelungiri`,
        })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))];
}
