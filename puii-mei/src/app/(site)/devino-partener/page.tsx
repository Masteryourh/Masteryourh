import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PartnerChooser } from "@/components/forms/PartnerChooser";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Devino partener – gospodării și investitori",
  description:
    "Gospodăriile pot crește pui la comandă cu Puii mei, iar investitorii pot susține producția locală. Aplică pentru parteneriat.",
  path: "/devino-partener",
});

const audiences: {
  id: "gospodarie" | "investitor";
  eyebrow: string;
  title: string;
  cta: string;
  items: { icon: IconName; title: string; text: string }[];
}[] = [
  {
    id: "gospodarie",
    eyebrow: "Pentru gospodării",
    title: "Crești pui la comandă, pentru clienți siguri",
    cta: "Aplică ca gospodărie",
    items: [
      { icon: "clipboard", title: "Cerere asigurată", text: "Crești doar puii deja comandați. Știi dinainte câți pui și pentru cine." },
      { icon: "leaf", title: "Hrana plătită în avans", text: "Clienții plătesc în avans hrana puilor, direct în contul gospodăriei tale." },
      { icon: "users", title: "Clienți din oraș", text: "Vinzi direct clienților. Platforma Puii mei îți aduce precomenzile." },
      { icon: "chart", title: "Consultanță completă", text: "Pe bază de contract: acte și autorizații, taxe, contabilitate, plăți și administrare, plus protocolul de creștere." },
    ],
  },
  {
    id: "investitor",
    eyebrow: "Pentru investitori",
    title: "Susții producția locală, cu cerere confirmată",
    cta: "Aplică ca investitor",
    items: [
      { icon: "clipboard", title: "Producție la comandă", text: "Fiecare lot pornește doar după ce precomenzile confirmă cererea." },
      { icon: "home", title: "Gospodării noi", text: "Adăposturi și echipamente pentru gospodăriile care vor să intre în producție." },
      { icon: "pin", title: "Extindere regională", text: "Ducem modelul Puii mei în orașe și județe noi, împreună cu parteneri locali." },
      { icon: "shield", title: "Transparență", text: "Trasabilitate pe fiecare lot și raportare clară despre producția susținută." },
    ],
  },
];

export default function BecomePartnerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Devino partener"
        title="Construim împreună rețeaua Puii mei"
        intro="Căutăm gospodării care vor să crească pui corect, cu evidență clară, și investitori care vor să susțină producția locală de calitate."
      />
      <Container className="py-14 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          {audiences.map((a) => (
            <section key={a.id} className="flex flex-col rounded-[2rem] bg-cream-100 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">{a.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{a.title}</h2>
              <ul className="mt-6 grid flex-1 gap-4 sm:grid-cols-2">
                {a.items.map((b) => (
                  <li key={b.title} className="rounded-2xl bg-white p-5">
                    <Icon name={b.icon} className="h-6 w-6 text-forest-700" />
                    <h3 className="mt-3 font-sans text-base font-semibold">{b.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{b.text}</p>
                  </li>
                ))}
              </ul>
              <a
                href={`#${a.id}`}
                className="mt-6 inline-flex items-center justify-center gap-2 self-start rounded-full bg-grain-400 px-6 py-3 font-semibold text-forest-900 hover:bg-grain-500"
              >
                {a.cta} <Icon name="arrow" className="h-5 w-5" />
              </a>
            </section>
          ))}
        </div>

        <div className="mt-16">
          <PartnerChooser />
        </div>
      </Container>
    </>
  );
}
