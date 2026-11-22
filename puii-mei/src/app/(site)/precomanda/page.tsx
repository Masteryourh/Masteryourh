import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PreorderForm } from "@/components/forms/PreorderForm";
import { constructionFrameEnabled } from "@/components/layout/ConstructionFrame";
import { currentPriceParams } from "@/server/repositories/settings";
import { lotRepository, zoneRepository } from "@/server/repositories/catalog";
import { availabilityDate } from "@/lib/lots";
import { sellableBirds } from "@/lib/growth";
import { pageMetadata } from "@/lib/seo";
import { pricing } from "@/lib/pricing";

export const metadata: Metadata = pageMetadata({
  title: "Precomandă pui crescuți la comandă",
  description:
    "Alege câți pui dorești și zona de livrare; gospodăria o alocăm automat. Vezi prețul total estimat, avansul (pui de o zi + furaj) și restul de plată la livrare, apoi plasează precomanda.",
  path: "/precomanda",
});

export default async function PreorderPage({ searchParams }: PageProps<"/precomanda">) {
  const sp = await searchParams;
  const [zones, openLots, params] = await Promise.all([zoneRepository.listActive(), lotRepository.openForPreorder(), currentPriceParams()]);
  const withRoom = openLots.filter((l) => sellableBirds(l) > 0);
  const capacity = {
    maxSingle: Math.max(0, ...withRoom.map((l) => sellableBirds(l))),
    nextDate: withRoom.length ? availabilityDate(withRoom[0]).toISOString() : null,
  };
  const birdsParam = typeof sp.pui === "string" ? Number.parseInt(sp.pui, 10) : NaN;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Precomandă" }]}
        eyebrow="Precomandă"
        title="Rezervă-ți puii din următorul lot"
        intro="Completezi în 2 minute. Plătești acum un avans – puii de o zi și furajul lor (~10 kg / pui) – direct în contul gospodăriei. Avansul se scade din prețul total; la livrare plătești doar diferența, după greutatea reală."
      />
      <Container className="py-12 sm:py-16">
        {constructionFrameEnabled() && (
          <div role="note" className="mb-8 rounded-2xl border-2 border-[#f5c400] bg-[#fff6c7] p-4 text-sm text-[#3d3200] sm:p-5">
            <p className="font-semibold">Site în construcție: comenzile se confirmă după lansare.</p>
            <p className="mt-1">
              Poți trimite precomanda acum: o înregistrăm și îți păstrăm locul. Confirmarea, alocarea pe gospodărie și plata
              avansului vin după lansare; te anunțăm pe email și telefon. Până atunci nu plătești nimic.
            </p>
          </div>
        )}
        <PreorderForm zones={zones} capacity={capacity} pricePerKg={params.pricePerKg} freeDeliveryFrom={params.freeDeliveryFrom} initialBirds={birdsParam >= 2 && birdsParam <= pricing.maxBirds ? birdsParam : undefined} />
      </Container>
    </>
  );
}
