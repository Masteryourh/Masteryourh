import { NextResponse } from "next/server";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { availabilityDate, availableBirds, currentStage, lotStatus } from "@/lib/lots";

/** API public de trasabilitate: GET /api/loturi/PM-2611-C01 */
export async function GET(_req: Request, ctx: RouteContext<"/api/loturi/[cod]">) {
  const { cod } = await ctx.params;
  const lot = await lotRepository.byCode(cod);
  if (!lot) return NextResponse.json({ error: "Lotul nu a fost găsit." }, { status: 404 });
  const farm = await farmRepository.bySlug(lot.farmSlug);
  return NextResponse.json({
    code: lot.code,
    status: lotStatus(lot),
    stage: currentStage(lot),
    startDate: lot.startDate,
    growthDays: lot.growthDays,
    estimatedAvailability: availabilityDate(lot).toISOString().slice(0, 10),
    availableBirds: availableBirds(lot),
    farm: farm ? { slug: farm.slug, name: farm.name, village: farm.village, county: farm.county } : null,
  });
}
