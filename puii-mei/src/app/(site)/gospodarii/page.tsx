import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { FarmCard } from "@/components/farms/FarmCard";
import { CtaBand } from "@/components/sections/CtaBand";
import { ButtonLink } from "@/components/ui/Button";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { lotStatus } from "@/lib/lots";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Gospodării partenere",
  description: "Cunoaște gospodăriile locale care cresc puii comandați prin Puii mei: localizare, practici de creștere și loturi disponibile.",
  path: "/gospodarii",
});

export default async function FarmsPage() {
  const [farms, lots] = await Promise.all([farmRepository.list(), lotRepository.list()]);
  return (
    <>
      <PageHeader
        eyebrow="Gospodării partenere"
        title="Oameni reali, gospodării reale"
        intro="Fiecare gospodărie parteneră este vizitată, verificată și monitorizată. Toate lucrează după un protocol comun de creștere, cu evidență zilnică pentru fiecare lot."
      />
      <Container className="py-14 sm:py-20">
        <p className="mb-8 rounded-2xl bg-grain-300/30 px-4 py-3 text-sm text-forest-900">
          Faza pilot: profilurile de mai jos prezintă formatul în care vor fi publicate gospodăriile partenere.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <FarmCard
              key={farm.slug}
              farm={farm}
              activeLots={lots.filter((l) => l.farmSlug === farm.slug && lotStatus(l) !== "livrat").length}
            />
          ))}
        </div>
        <div className="mt-16 rounded-3xl border border-forest-900/8 bg-white p-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <h2 className="text-2xl font-semibold">Ai o gospodărie și vrei să devii partener?</h2>
            <p className="mt-2 max-w-xl text-muted">
              Primești precomenzi cu puii de o zi și furajul plătite în avans de clienți și consultanță pentru creștere. Tu crești și vinzi puii după protocolul Puii mei.
            </p>
          </div>
          <ButtonLink href="/devino-partener#gospodarie" variant="secondary" className="mt-6 shrink-0 sm:mt-0">
            Aplică pentru parteneriat
          </ButtonLink>
        </div>
      </Container>
      <CtaBand />
    </>
  );
}
