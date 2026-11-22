import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PreorderForm, type LotOption } from "@/components/forms/PreorderForm";
import { farmRepository, lotRepository, zoneRepository } from "@/server/repositories/catalog";
import { availabilityDate, availableBirds } from "@/lib/lots";
import { pageMetadata } from "@/lib/seo";
import { farmPaymentRepository } from "@/server/repositories/farm-payments";

export const metadata: Metadata = pageMetadata({
  title: "Precomandă pui crescuți la comandă",
  description:
    "Alege câți pui dorești, lotul și zona de livrare. Vezi prețul total estimat, avansul (pui de o zi + furaj) și restul de plată la livrare, apoi plasează precomanda.",
  path: "/precomanda",
});

export default async function PreorderPage({ searchParams }: PageProps<"/precomanda">) {
  const sp = await searchParams;
  const [zones, openLots, farms] = await Promise.all([
    zoneRepository.listActive(),
    lotRepository.openForPreorder(),
    farmRepository.list(),
  ]);
  const farmBySlug = new Map(farms.map((f) => [f.slug, f]));
  const feedPrice = new Map(
    (await Promise.all(farms.map((f) => farmPaymentRepository.bySlug(f.slug)))).filter((x) => x !== null).map((x) => [x.id, x] as const),
  );
  const lots: LotOption[] = openLots.map((l) => ({
    code: l.code,
    farmName: farmBySlug.get(l.farmSlug)?.name ?? "",
    village: farmBySlug.get(l.farmSlug)?.village ?? "",
    availableFrom: availabilityDate(l).toISOString(),
    free: availableBirds(l),
    feedPricePerKg: feedPrice.get(l.farmSlug)?.feedPricePerKg,
    chickPricePerBird: feedPrice.get(l.farmSlug)?.chickPricePerBird,
  }));
  const lot = typeof sp.lot === "string" ? sp.lot.toUpperCase() : undefined;
  const birdsParam = typeof sp.pui === "string" ? Number.parseInt(sp.pui, 10) : NaN;

  return (
    <>
      <PageHeader
        eyebrow="Precomandă"
        title="Rezervă-ți puii din următorul lot"
        intro="Completezi în 2 minute. Plătești acum un avans – puii de o zi și furajul lor (~7 kg / pui) – direct în contul gospodăriei. Avansul se scade din prețul total; la livrare plătești doar diferența, după greutatea reală."
      />
      <Container className="py-12 sm:py-16">
        <PreorderForm zones={zones} lots={lots} initialLot={lot} initialBirds={birdsParam >= 2 && birdsParam <= 100 ? birdsParam : undefined} />
      </Container>
    </>
  );
}
