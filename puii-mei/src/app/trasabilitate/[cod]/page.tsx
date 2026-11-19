import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LotStatusBadge } from "@/components/lots/LotStatusBadge";
import { LotTimeline } from "@/components/lots/LotTimeline";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import {
  availabilityDate,
  availableBirds,
  growthProgress,
  isOpenForPreorder,
  lotDay,
  lotStatus,
} from "@/lib/lots";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const lots = await lotRepository.list();
  return lots.map((l) => ({ cod: l.code }));
}

export async function generateMetadata({ params }: PageProps<"/trasabilitate/[cod]">): Promise<Metadata> {
  const { cod } = await params;
  const lot = await lotRepository.byCode(cod);
  if (!lot) return { title: "Lot negăsit" };
  return pageMetadata({
    title: `Lotul ${lot.code}`,
    description: `Trasabilitate pentru lotul ${lot.code}: gospodăria parteneră, etapele de creștere și data estimată a disponibilității.`,
    path: `/trasabilitate/${lot.code}`,
  });
}

export default async function LotPage({ params }: PageProps<"/trasabilitate/[cod]">) {
  const { cod } = await params;
  const lot = await lotRepository.byCode(decodeURIComponent(cod));
  if (!lot) notFound();
  const farm = await farmRepository.bySlug(lot.farmSlug);
  const status = lotStatus(lot);
  const day = lotDay(lot);
  const progress = growthProgress(lot);

  return (
    <>
      <section className="bg-cream-100">
        <Container className="py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/trasabilitate" className="hover:text-forest-800">Trasabilitate</Link>
            <span aria-hidden> / </span>
            <span className="text-forest-900">{lot.code}</span>
          </nav>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Lot de producție</p>
              <h1 className="mt-2 font-mono text-4xl font-semibold tracking-tight sm:text-5xl">{lot.code}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <LotStatusBadge status={status} />
                {farm && (
                  <Link href={`/gospodarii/${farm.slug}`} className="text-sm font-medium text-forest-700 hover:underline">
                    {farm.name}, {farm.village}
                  </Link>
                )}
              </div>
            </div>
            {isOpenForPreorder(lot) && (
              <ButtonLink href={`/precomanda?lot=${lot.code}`} size="lg">
                Rezervă din acest lot
              </ButtonLink>
            )}
          </div>
        </Container>
      </section>

      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Etapele de creștere</h2>
          {status === "in-crestere" && (
            <div className="mt-5 rounded-2xl bg-forest-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-forest-800">Ziua {day} din {lot.growthDays}</span>
                <span className="text-muted">{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-forest-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <div className="mt-8">
            <LotTimeline lot={lot} />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl bg-forest-900 p-6 text-cream-50">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-grain-300">Fișa lotului</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <Item label="Gospodăria parteneră" value={farm ? `${farm.name}, ${farm.village}, jud. ${farm.county}` : "—"} />
              <Item label="Data începerii creșterii" value={formatDate(lot.startDate)} />
              <Item label="Durata creșterii" value={`${lot.growthDays} de zile`} />
              <Item label="Disponibilitate estimată" value={formatDate(availabilityDate(lot))} highlight />
              <Item label="Tip pasăre" value={lot.breed} />
              <Item label="Furajare" value={lot.feed} />
              <Item label="Procesare" value={lot.processor} />
              <Item
                label="Mărime lot"
                value={`${lot.totalBirds} pui${status === "precomenzi-deschise" ? ` · ${availableBirds(lot)} locuri libere` : ""}`}
              />
            </dl>
            {lot.notes && <p className="mt-5 border-t border-white/10 pt-4 text-sm text-cream-100/75">{lot.notes}</p>}
          </div>
          <div className="flex gap-3 rounded-3xl bg-cream-100 p-5 text-sm text-muted">
            <Icon name="shield" className="h-5 w-5 shrink-0 text-forest-700" />
            <p>Datele despre etape se actualizează automat pe baza calendarului lotului și a raportărilor gospodăriei.</p>
          </div>
        </aside>
      </Container>
    </>
  );
}

function Item({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-cream-100/60">{label}</dt>
      <dd className={highlight ? "mt-0.5 font-display text-xl font-semibold text-grain-300" : "mt-0.5 font-medium"}>{value}</dd>
    </div>
  );
}
