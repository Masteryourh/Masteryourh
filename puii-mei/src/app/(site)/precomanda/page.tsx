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
    "Alege câți pui dorești, lotul și zona de livrare. Vezi valoarea estimativă și hrana de plătit în avans, apoi plasează precomanda.",
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
    (await Promise.all(farms.map((f) => farmPaymentRepository.bySlug(f.slug)))).filter((x) => x !== null).map((x) => [x.id, x.feedPricePerKg]),
  );
  const lots: LotOption[] = openLots.map((l) => ({
    code: l.code,
    farmName: farmBySlug.get(l.farmSlug)?.name ?? "",
    village: farmBySlug.get(l.farmSlug)?.village ?? "",
    availableFrom: availabilityDate(l).toISOString(),
    free: availableBirds(l),
    feedPricePerKg: feedPrice.get(l.farmSlug),
  }));
  const lot = typeof sp.lot === "string" ? sp.lot.toUpperCase() : undefined;
  const birdsParam = typeof sp.pui === "string" ? Number.parseInt(sp.pui, 10) : NaN;

  return (
    <>
      <PageHeader
        eyebrow="Precomandă"
        title="Rezervă-ți puii din următorul lot"
        intro="Completezi în 2 minute. Te sunăm pentru confirmare. Hrana puilor (aproximativ 6 kg de furaj pe pui) se plătește în avans, direct în contul gospodăriei; restul, la livrare, după greutatea reală."
      />
      <Container className="py-12 sm:py-16">
        <PreorderForm zones={zones} lots={lots} initialLot={lot} initialBirds={birdsParam >= 2 && birdsParam <= 100 ? birdsParam : undefined} />
      </Container>
    </>
  );
}
