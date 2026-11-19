import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LotCard } from "@/components/lots/LotCard";
import { LotLookup } from "@/components/lots/LotLookup";
import { Icon, type IconName } from "@/components/ui/Icon";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { normalizeLotCode } from "@/lib/lots";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Trasabilitate – urmărește lotul tău de pui",
  description:
    "Introdu codul lotului și vezi gospodăria parteneră, data începerii creșterii, etapele de creștere, statusul producției și data estimată a disponibilității.",
  path: "/trasabilitate",
});

const tracked: { icon: IconName; label: string }[] = [
  { icon: "search", label: "Identificarea lotului" },
  { icon: "sprout", label: "Data începerii creșterii" },
  { icon: "home", label: "Gospodăria parteneră" },
  { icon: "chart", label: "Etapele de creștere" },
  { icon: "clipboard", label: "Statusul producției" },
  { icon: "truck", label: "Data estimată a disponibilității" },
];

export default async function TraceabilityPage({ searchParams }: PageProps<"/trasabilitate">) {
  const { cod } = await searchParams;
  let error: string | undefined;
  if (typeof cod === "string" && cod.trim()) {
    const lot = await lotRepository.byCode(cod);
    if (lot) redirect(`/trasabilitate/${lot.code}`);
    error = `Nu am găsit lotul „${normalizeLotCode(cod)}”. Verifică codul de pe etichetă (format PM-AALL-X00).`;
  }

  const [lots, farms] = await Promise.all([lotRepository.list(), farmRepository.listAll()]);
  const farmBySlug = new Map(farms.map((f) => [f.slug, f]));

  return (
    <>
      <PageHeader
        eyebrow="Trasabilitate"
        title="Știi unde cresc. Știi ce ajunge pe masa ta."
        intro="Fiecare lot de producție are un cod unic, tipărit pe eticheta produsului și în confirmarea precomenzii."
      >
        <LotLookup defaultValue={typeof cod === "string" ? cod : undefined} error={error} />
      </PageHeader>

      <Container className="py-14 sm:py-20">
        <SectionHeading eyebrow="Ce poți verifica" title="Informațiile publicate pentru fiecare lot" />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tracked.map((t) => (
            <li key={t.label} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-forest-900/8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <Icon name={t.icon} className="h-5 w-5" />
              </span>
              <span className="font-medium">{t.label}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-16 text-3xl font-semibold">Toate loturile</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => (
            <LotCard key={lot.code} lot={lot} farm={farmBySlug.get(lot.farmSlug)} />
          ))}
        </div>
      </Container>
    </>
  );
}
