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
    "Alegi cantitatea, plasezi precomanda, noi organizăm creșterea în gospodării partenere, urmărești lotul și primești puiul proaspăt, sacrificat tradițional în gospodărie.",
  path: "/cum-functioneaza",
});

const responsibilities: { icon: IconName; title: string; text: string }[] = [
  { icon: "clipboard", title: "Precomenzi și planificare", text: "Adunăm cererea și planificăm loturile, astfel încât fiecare pui crescut să aibă deja un client." },
  { icon: "leaf", title: "Hrană plătită în avans", text: "Clienții plătesc în avans hrana puilor, aproximativ 6 kg de furaj pe pui, direct în contul gospodăriei partenere." },
  { icon: "chart", title: "Monitorizarea creșterii", text: "Jurnal zilnic al fiecărui lot, vizite periodice și supraveghere veterinară." },
  { icon: "shield", title: "Sacrificare tradițională", text: "Fiecare lot este sacrificat în gospodăria în care a crescut, cu respectarea normelor sanitar-veterinare și etichetarea lotului." },
  { icon: "truck", title: "Distribuție", text: "Livrare în lanț frigorific, în ziua stabilită pentru zona ta, sau ridicare personală." },
  { icon: "users", title: "Relația cu clienții", text: "Confirmări, actualizări despre lot și suport, într-un singur loc." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cum funcționează"
        title="Tu comanzi. Noi îi creștem."
        intro="Puii mei inversează modelul obișnuit: nu cumperi ce s-a produs deja, ci comanzi înainte, iar producția se organizează pentru tine."
      />
      <section className="py-16 sm:py-20">
        <Container className="max-w-4xl">
          <Steps detailed />
        </Container>
      </section>
      <section className="bg-cream-100 py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Ce gestionăm noi"
            title="Tu alegi. Noi ne ocupăm de restul."
            intro="Coordonăm și oferim consultanță pe tot parcursul, de la planificare la livrare, împreună cu gospodăriile partenere. Vânzarea și plata se fac direct între tine și gospodărie."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {responsibilities.map((r) => (
              <div key={r.title} className="rounded-3xl bg-white p-7">
                <Icon name={r.icon} className="h-7 w-7 text-forest-700" />
                <h3 className="mt-4 text-xl font-semibold">{r.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{r.text}</p>
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
