import "server-only";
import { tourRepository } from "./repositories/delivery";

export interface AdminAlert {
  id: string;
  kind: "prelungire";
  at: string;
  title: string;
  text: string;
  href: string;
}

/** Ce așteaptă decizia adminului acum: cererile de prelungire ale curierilor. */
export async function adminAlerts(): Promise<AdminAlert[]> {
  const tours = await tourRepository.list();
  return tours
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
    .sort((a, b) => b.at.localeCompare(a.at));
}
