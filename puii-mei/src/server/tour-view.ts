import "server-only";
import type { Tour } from "@/lib/domain";
import type { Stop } from "@/components/delivery/TourTimeline";
import { farmRepository } from "./repositories/catalog";
import { preorderRepository } from "./repositories/preorders";
import { parcelRepository } from "./repositories/delivery";
import { tourStart } from "./delivery";

/** Datele necesare pentru afișarea unei ture (opriri, start, gospodărie). */
export async function loadTourView(tour: Tour) {
  const parcels = await Promise.all(tour.parcelIds.map((id) => parcelRepository.byId(id)));
  const stops: Stop[] = [];
  for (const p of parcels) if (p) stops.push({ parcel: p, preorder: await preorderRepository.byId(p.id) });
  const [start, farm] = await Promise.all([
    tourStart(tour.farmSlug),
    farmRepository.bySlug(tour.farmSlug, { includeInactive: true }),
  ]);
  return { stops, start, farm, farmName: farm ? `${farm.name}, ${farm.village}` : tour.farmSlug };
}
