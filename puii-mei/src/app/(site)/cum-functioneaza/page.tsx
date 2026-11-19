import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Steps } from "@/components/sections/Steps";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";
import { Icon, type IconName } from "@/components/ui/Icon";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cum funcționează precomanda de pui",
  description:
    "Alegi cantitatea, plasezi precomanda, gospodăriile partenere cresc puii, urmărești lotul și primești puiul proaspăt, sacrificat tradițional în gospodărie.",
  path: "/cum-functioneaza",
});

const roles: { who: string; subtitle: string; items: { icon: IconName; title: string; text: string }[] }[] = [
  {
    who: "Gospodăria parteneră",
    subtitle: "Crește, sacrifică și vinde.",
    items: [
      { icon: "sprout", title: "Creșterea puilor", text: "Adăpost, hrană și îngrijire zilnică, după protocolul comun de creștere." },
      { icon: "shield", title: "Sacrificare tradițională", text: "Fiecare lot este sacrificat în gospodăria în care a crescut, cu respectarea normelor sanitar-veterinare și etichetarea lotului." },
      { icon: "truck", title: "Vânzarea", text: "Vinde direct clientului: încasează avansul pentru hrană și plata la final, apoi predă puii proaspeți în ziua stabilită." },
    ],
  },
  {
    who: "Puii mei",
    subtitle: "Platformă și consultanță.",
    items: [
      { icon: "clipboard", title: "Precomenzi", text: "Platforma preia precomenzile și le transmite gospodăriilor, ca fiecare pui crescut să aibă deja un client." },
      { icon: "chart", title: "Consultanță", text: "Sprijin pentru gospodării: protocol de creștere, evidența lotului și cerințele sanitar-veterinare." },
      { icon: "users", title: "Trasabilitate și informare", text: "Publică datele fiecărui lot și îți trimite confirmări și actualizări." },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cum funcționează"
        title="Tu comanzi. Gospodăriile îi cresc."
        intro="Modelul e inversat: nu cumperi ce s-a produs deja, ci comanzi înainte, iar gospodăriile partenere cresc puii pentru tine."
      />
      <section className="py-16 sm:py-20">
        <Container className="max-w-4xl">
          <Steps detailed />
        </Container>
      </section>
      <section className="bg-cream-100 py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Cine ce face"
            title="Gospodăriile cresc. Puii mei vă pune în legătură."
            intro="Vânzarea și plata se fac direct între tine și gospodăria parteneră. Puii mei este platforma care preia precomenzile și oferă consultanță gospodăriilor."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {roles.map((role) => (
              <div key={role.who} className="rounded-[2rem] bg-white p-6 sm:p-8">
                <h3 className="text-2xl font-semibold">{role.who}</h3>
                <p className="mt-1 text-muted">{role.subtitle}</p>
                <ul className="mt-6 space-y-5">
                  {role.items.map((r) => (
                    <li key={r.title} className="flex gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                        <Icon name={r.icon} className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="font-semibold text-forest-900">{r.title}</p>
                        <p className="mt-1 leading-relaxed text-muted">{r.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="Întrebări frecvente" title="Ce întreabă clienții" />
          <Faq />
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
