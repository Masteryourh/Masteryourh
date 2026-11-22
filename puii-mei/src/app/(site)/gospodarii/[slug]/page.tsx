import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { LotCard } from "@/components/lots/LotCard";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { isOpenForPreorder, lotStatus } from "@/lib/lots";
import { JsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const farms = await farmRepository.list();
  return farms.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/gospodarii/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const farm = await farmRepository.bySlug(slug);
  if (!farm) return {};
  return pageMetadata({
    title: `${farm.name}, ${farm.village} – gospodărie parteneră`,
    description: farm.shortDescription,
    path: `/gospodarii/${farm.slug}`,
  });
}

export default async function FarmPage({ params }: PageProps<"/gospodarii/[slug]">) {
  const { slug } = await params;
  const farm = await farmRepository.bySlug(slug);
  if (!farm) notFound();
  const lots = await lotRepository.byFarm(farm.slug);
  const openLot = lots.filter((l) => isOpenForPreorder(l)).at(-1);

  return (
    <>
      <section className="bg-cream-100">
        <Container className="py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/gospodarii" className="hover:text-forest-800">Gospodării partenere</Link>
            <span aria-hidden> / </span>
            <span className="text-forest-900">{farm.name}</span>
          </nav>
          <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="animate-fade-up">
              <p className="flex items-center gap-1.5 text-sm font-medium text-grain-600">
                <Icon name="pin" className="h-4 w-4" /> {farm.village}, jud. {farm.county}
              </p>
              <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{farm.name}</h1>
              <p className="mt-2 text-lg text-forest-700">{farm.owner}</p>
              <p className="mt-5 text-lg leading-relaxed text-muted">{farm.description}</p>
              {openLot && (
                <div className="mt-8">
                  <ButtonLink href="/precomanda" size="lg">
                    Fă o precomandă
                  </ButtonLink>
                </div>
              )}
            </div>
            <Photo src={farm.photos[0].src} alt={farm.photos[0].alt} priority className="aspect-[4/3] rounded-[2rem]" />
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-3xl font-semibold">Cum cresc puii aici</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {farm.practices.map((p) => (
                <li key={p} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-forest-900/8">
                  <Icon name="check" className="h-5 w-5 shrink-0 text-forest-500" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="rounded-3xl bg-forest-50 p-7">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-forest-700">Informații despre producție</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <Info label="Localizare" value={`${farm.village}, județul ${farm.county}`} />
              <Info label="Partener Puii mei din" value={String(farm.since)} />
              <Info label="Capacitate pe lot" value={`până la ${farm.capacityPerLot} pui`} />
              <Info label="Autorizare" value={farm.veterinaryRegistration} />
              <Info label="Loturi" value={`${lots.length} (${lots.filter((l) => lotStatus(l) !== "livrat").length} active)`} />
            </dl>
          </aside>
        </div>

        <h2 className="mt-16 text-3xl font-semibold">Fotografii</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {farm.photos.map((ph) => (
            <Photo key={ph.src} src={ph.src} alt={ph.alt} className="aspect-[4/3] rounded-3xl" sizes="(min-width: 640px) 33vw, 100vw" />
          ))}
        </div>

        <h2 className="mt-16 text-3xl font-semibold">Loturile gospodăriei</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => (
            <LotCard key={lot.code} lot={lot} />
          ))}
        </div>
      </Container>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: farm.name,
          description: farm.shortDescription,
          address: { "@type": "PostalAddress", addressLocality: farm.village, addressRegion: farm.county, addressCountry: "RO" },
          ...(farm.coordinates && {
            geo: { "@type": "GeoCoordinates", latitude: farm.coordinates.lat, longitude: farm.coordinates.lng },
          }),
        }}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-forest-900">{value}</dd>
    </div>
  );
}
