import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Photo } from "@/components/ui/Photo";
import { CtaBand } from "@/components/sections/CtaBand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Despre noi – misiunea Puii mei",
  description:
    "Puii mei conectează direct consumatorii cu gospodării locale partenere, prin producție la comandă, cerere agregată și trasabilitate.",
  path: "/despre-noi",
});

const values = [
  { title: "Transparență", text: "Publicăm gospodăria, calendarul și etapele fiecărui lot. Fără etichete vagi de tipul „de țară”." },
  { title: "Corectitudine", text: "Gospodăriile primesc un preț corect și cerere garantată. Clienții plătesc pentru ce primesc, la greutatea reală." },
  { title: "Legalitate", text: "Respectăm cerințele sanitar-veterinare. Puii sunt sacrificați tradițional, în gospodăria în care au crescut." },
  { title: "Comunitate", text: "Construim o comunitate de clienți și producători care cred că mâncarea bună începe cu încredere." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Despre noi"
        title="Aducem gospodăria mai aproape de masa ta"
        intro="Puii mei – Pui de carne crescuți la comandă. O platformă care conectează direct consumatorii cu gospodăriile locale partenere."
      />
      <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div className="space-y-5 text-lg leading-relaxed text-ink/85">
          <h2 className="text-3xl font-semibold">Misiunea noastră</h2>
          <p>
            Mulți dintre noi ne amintim gustul puiului crescut la bunici. Astăzi, cine vrea așa ceva are de ales între
            raftul supermarketului și un vecin de încredere – dacă are norocul să-l găsească.
          </p>
          <p>
            Puii mei propune o a treia cale: <strong>producție la comandă</strong>. Clienții comandă online cantitatea
            dorită, iar noi organizăm producția împreună cu gospodăriile partenere. Puii sunt crescuți în gospodării
            monitorizate, cu respectarea cerințelor legale și a standardelor de creștere, iar fiecare etapă este urmărită
            pentru transparență și trasabilitate.
          </p>
          <p>
            Gestionăm întregul proces: precomenzi, planificarea producției, aprovizionarea, monitorizarea creșterii,
            sacrificarea tradițională în gospodărie și distribuția către clienți. Vânzarea se face direct între client și gospodăria parteneră, iar Puii mei oferă organizarea și consultanța.
          </p>
        </div>
        <Photo src="/images/despre-noi.jpg" alt="Gospodar și pui într-o curte rurală" className="aspect-[4/3] rounded-[2rem]" />
      </Container>

      <section className="bg-forest-900 py-16 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-300">Colaborarea</p>
              <h2 className="mt-3 text-3xl font-semibold text-cream-50 sm:text-4xl">Cerere agregată, producție planificată</h2>
            </div>
            <div className="grid gap-6 text-cream-100/80 sm:grid-cols-2">
              <div>
                <h3 className="font-sans text-lg font-semibold text-cream-50">Pentru consumatori</h3>
                <p className="mt-2 leading-relaxed">
                  Știi exact de unde vine carnea, cum a fost crescută și când ajunge la tine. Comanzi o dată, primești
                  proaspăt.
                </p>
              </div>
              <div>
                <h3 className="font-sans text-lg font-semibold text-cream-50">Pentru gospodării</h3>
                <p className="mt-2 leading-relaxed">
                  Cerere sigură înainte de a începe creșterea, aprovizionare organizată și acces la clienți din oraș, fără
                  intermediari inutili.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow="Valori" title="Ce ne ghidează" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-3xl bg-cream-100 p-7">
              <h3 className="text-xl font-semibold">{v.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{v.text}</p>
            </div>
          ))}
        </div>
      </Container>
      <CtaBand title="Puii mei. De la gospodărie, direct la masa ta." />
    </>
  );
}
