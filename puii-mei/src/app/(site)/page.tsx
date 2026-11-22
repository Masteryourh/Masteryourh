import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Hero } from "@/components/home/Hero";
import { Story } from "@/components/home/Story";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";
import { UpcomingProductGrid } from "@/components/sections/UpcomingProducts";
import { FarmCard } from "@/components/farms/FarmCard";
import { LotCard } from "@/components/lots/LotCard";
import { LotLookup } from "@/components/lots/LotLookup";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { lotStatus } from "@/lib/lots";

// Statusul loturilor depinde de dată – regenerăm pagina periodic.
export const revalidate = 3600;

function openMonths(dates: string[]) {
  const fmt = new Intl.DateTimeFormat("ro-RO", { month: "long", timeZone: "Europe/Bucharest" });
  const months = [...new Set(dates.map((d) => fmt.format(new Date(`${d}T12:00:00`))))];
  return months.length > 1 ? `${months.slice(0, -1).join(", ")} și ${months.at(-1)}` : months[0];
}

export default async function HomePage() {
  const [farms, lots, openLots] = await Promise.all([
    farmRepository.list(),
    lotRepository.list(),
    lotRepository.openForPreorder(),
  ]);
  const farmBySlug = new Map(farms.map((f) => [f.slug, f]));

  return (
    <>
      <Hero
        openLabel={
          openLots.length > 0
            ? `Precomenzi deschise pentru loturile din ${openMonths(openLots.map((l) => l.startDate))}`
            : "Înscrie-te pentru următorul lot"
        }
      />

      <Story />

      {/* INTENȚIA */}
      <section className="pb-20 sm:pb-28">
        <Container>
          <div className="grid items-center gap-8 rounded-[2rem] bg-forest-900 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-300">Intenția noastră</p>
              <h2 className="mt-3 text-3xl font-semibold text-cream-50 sm:text-4xl">
                O gospodărie poate deveni o afacere de familie
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-cream-100/80">
                Vrem ca munca din gospodărie să aducă un venit stabil și legal, fără ca gospodarul să plece de acasă.
                Fiecare gospodar din program primește consultanță pe bază de contract: acte, taxe, contabilitate, plăți
                și administrare.
              </p>
            </div>
            <div className="lg:justify-self-end">
              <ButtonLink href="/despre-noi#intentie" size="lg">
                De ce am pornit Puii mei <Icon name="arrow" className="h-5 w-5" />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* LOTURI DESCHISE */}
      <section className="py-20 sm:py-28">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Loturi deschise"
              title="Rezervă din următoarele loturi"
              intro="Fiecare lot are o dată de început, o gospodărie și un număr limitat de pui. Când locurile se ocupă, lotul se închide."
            />
            <ButtonLink href="/precomanda" variant="secondary">
              Toate opțiunile de comandă
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {openLots.map((lot) => (
              <LotCard key={lot.code} lot={lot} farm={farmBySlug.get(lot.farmSlug)} />
            ))}
            {openLots.length === 0 && (
              <p className="rounded-3xl bg-cream-100 p-6 text-muted">
                Momentan nu avem loturi deschise. Plasează o precomandă pentru „primul lot disponibil” și te anunțăm.
              </p>
            )}
          </div>
        </Container>
      </section>

      {/* GOSPODĂRII */}
      <section className="bg-cream-100 py-20 sm:py-28">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Gospodării partenere"
              title="Oamenii care cresc puii tăi"
              intro="Gospodării de familie, verificate și monitorizate, care lucrează după același protocol de creștere."
            />
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/gospodarii" variant="secondary">
                Toate gospodăriile
              </ButtonLink>
              <ButtonLink href="/devino-partener" variant="ghost">
                Ai o gospodărie? Devino partener
              </ButtonLink>
            </div>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {farms.map((farm) => (
              <FarmCard
                key={farm.slug}
                farm={farm}
                activeLots={lots.filter((l) => l.farmSlug === farm.slug && lotStatus(l) !== "livrat").length}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* TRASABILITATE */}
      <section className="py-20 sm:py-28">
        <Container>
          <div className="grid items-center gap-12 rounded-[2rem] bg-forest-900 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-300">Trasabilitate</p>
              <h2 className="mt-3 text-3xl font-semibold text-cream-50 sm:text-4xl">
                Știi ce comanzi. Știi unde cresc. Știi ce ajunge pe masa ta.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-cream-100/75">
                Introdu codul lotului și vezi gospodăria, data începerii creșterii, etapele parcurse și data estimată a
                disponibilității.
              </p>
            </div>
            <LotLookup dark />
          </div>
        </Container>
      </section>

      {/* ÎN CURÂND */}
      <section className="bg-cream-100 py-20 sm:py-28">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="În curând"
              title="Mai mult decât pui"
              intro="Urmează curcani, rațe, fazani, legume din seră, borcane din cămară, afumături, păstrăvi și pachete pentru congelator. Ce ajunge în zona ta depinde de gospodăriile partenere din regiune."
            />
            <ButtonLink href="/in-curand" variant="secondary">
              Anunță-mă când ajung în zona mea
            </ButtonLink>
          </div>
          <div className="mt-12">
            <UpcomingProductGrid />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="pt-20 pb-8 sm:pt-28">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading
            eyebrow="Întrebări frecvente"
            title="Bine de știut înainte de comandă"
            intro={
              <>
                Nu găsești răspunsul?{" "}
                <a href="/contact" className="font-semibold text-forest-700 underline underline-offset-4">
                  Scrie-ne
                </a>
                .
              </>
            }
          />
          <Faq />
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
