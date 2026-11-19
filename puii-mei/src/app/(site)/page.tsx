import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Steps } from "@/components/sections/Steps";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";
import { UpcomingProductGrid } from "@/components/sections/UpcomingProducts";
import { FarmCard } from "@/components/farms/FarmCard";
import { LotCard } from "@/components/lots/LotCard";
import { LotLookup } from "@/components/lots/LotLookup";
import { farmRepository, lotRepository } from "@/server/repositories/catalog";
import { lotStatus } from "@/lib/lots";
import { pricing } from "@/lib/pricing";

// Statusul loturilor depinde de dată – regenerăm pagina periodic.
export const revalidate = 3600;

const pillars: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "clipboard",
    title: "Producție la comandă",
    text: "Creștem doar câți pui au fost comandați. Cererea agregată înseamnă planificare corectă, fără risipă și fără stocuri vechi.",
  },
  {
    icon: "home",
    title: "Gospodării partenere",
    text: "Lucrăm cu gospodării locale, selectate și monitorizate, care respectă același protocol de creștere și cerințele legale.",
  },
  {
    icon: "shield",
    title: "Trasabilitate completă",
    text: "Fiecare lot are un cod unic. Știi unde au crescut puii, cu ce au fost hrăniți și unde au fost sacrificați.",
  },
];

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
  const growingLot = lots.find((l) => lotStatus(l) === "in-crestere");

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-cream-100">
        <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-forest-800 ring-1 ring-forest-900/10">
              <span className="h-2 w-2 rounded-full bg-forest-500" aria-hidden />
              {openLots.length > 0
                ? `Precomenzi deschise pentru loturile din ${openMonths(openLots.map((l) => l.startDate))}`
                : "Înscrie-te pentru următorul lot"}
            </p>
            <h1 className="mt-6 text-5xl leading-[1.05] font-semibold sm:text-6xl lg:text-7xl">
              Puii tăi, crescuți <span className="text-forest-500 italic">pentru tine.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Comanzi în avans, noi organizăm creșterea și livrarea. Pui de carne crescuți fără grabă în gospodării
              locale partenere, sacrificați tradițional în gospodărie și livrați proaspăt.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/precomanda" size="lg">
                Vreau să comand <Icon name="arrow" className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink href="/cum-functioneaza" size="lg" variant="secondary">
                Cum funcționează?
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-forest-900/10 pt-6 sm:gap-4">
              <div className="flex flex-col justify-between">
                <dt className="text-xs text-muted">Preț estimativ</dt>
                <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold text-forest-900 sm:text-2xl">
                  {pricing.pricePerKg} lei
                  <span className="text-sm font-normal text-muted">/kg</span>
                </dd>
              </div>
              <div className="flex flex-col justify-between">
                <dt className="text-xs text-muted">Durata creșterii</dt>
                <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold text-forest-900 sm:text-2xl">~8 săpt.</dd>
              </div>
              <div className="flex flex-col justify-between">
                <dt className="text-xs text-muted">Gospodării partenere</dt>
                <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold text-forest-900 sm:text-2xl">{farms.length}</dd>
              </div>
            </dl>
          </div>
          <div className="relative animate-fade-up [animation-delay:150ms]">
            <Photo
              src="/images/hero.jpg"
              alt="Pui crescuți liber în curtea unei gospodării rurale"
              priority
              className="aspect-[4/3] rounded-[2rem] shadow-2xl shadow-forest-900/15 sm:aspect-[5/4] lg:aspect-[4/5]"
            />
            {growingLot && (
              <div className="absolute -bottom-5 left-4 right-4 rounded-2xl bg-white/95 p-4 shadow-xl shadow-forest-900/10 backdrop-blur sm:left-auto sm:right-6 sm:w-72">
                <p className="text-xs font-semibold uppercase tracking-wider text-grain-600">Lot în creștere</p>
                <p className="mt-1 font-mono text-sm font-semibold text-forest-900">{growingLot.code}</p>
                <p className="text-sm text-muted">{farmBySlug.get(growingLot.farmSlug)?.name}</p>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* PROPUNERE DE VALOARE */}
      <section className="py-20 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="De ce Puii mei"
            title="Nu un magazin de carne. Un mod diferit de a produce."
            intro="Puii mei conectează direct familiile care vor să știe ce mănâncă cu gospodăriile care vor să crească păsări corect. Tu comanzi astăzi, noi creștem pentru tine, tu primești proaspăt."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-3xl bg-cream-100 p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-forest-700">
                  <Icon name={p.icon} />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CUM FUNCȚIONEAZĂ */}
      <section id="cum-functioneaza" className="bg-forest-50/60 py-20 sm:py-28">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow="Cum funcționează" title="Cinci pași de la comandă la masa ta" />
            <ButtonLink href="/cum-functioneaza" variant="secondary">
              Detalii despre proces
            </ButtonLink>
          </div>
          <div className="mt-12">
            <Steps />
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
              intro="Urmează curcani, rațe, fazani și legume din seră. Ce ajunge în zona ta depinde de gospodăriile partenere din regiune."
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
