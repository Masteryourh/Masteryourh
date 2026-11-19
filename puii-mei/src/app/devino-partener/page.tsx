import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PartnerForm } from "@/components/forms/PartnerForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Devino gospodărie parteneră",
  description:
    "Ai o gospodărie și vrei să crești pui la comandă? Aplică pentru parteneriat cu Puii mei: cerere asigurată prin precomenzi, hrană plătită în avans de clienți și consultanță.",
  path: "/devino-partener",
});

const benefits: { icon: IconName; title: string; text: string }[] = [
  { icon: "clipboard", title: "Cerere asigurată", text: "Crești doar puii deja comandați. Știi dinainte câți pui și pentru cine." },
  { icon: "leaf", title: "Hrana plătită în avans", text: "Clienții plătesc în avans hrana puilor, direct în contul gospodăriei tale." },
  { icon: "users", title: "Clienți din oraș", text: "Vinzi direct clienților, fără intermediari. Noi organizăm precomenzile și livrarea." },
  { icon: "chart", title: "Consultanță", text: "Te ajutăm cu protocolul de creștere, evidența lotului și cerințele sanitar-veterinare." },
];

const process = [
  "Trimiți formularul de mai jos.",
  "Te sunăm ca să discutăm despre gospodărie.",
  "Venim în vizită și verificăm împreună spațiul.",
  "Semnăm parteneriatul și publicăm profilul gospodăriei.",
  "Primești primul lot, pe baza precomenzilor.",
];

export default function BecomePartnerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pentru gospodării"
        title="Crește pui la comandă cu Puii mei"
        intro="Căutăm gospodării care vor să crească pui corect, cu evidență clară, pentru clienți care știu și apreciază de unde vine mâncarea."
      />
      <Container className="py-14 sm:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-3xl bg-cream-100 p-6">
              <Icon name={b.icon} className="h-7 w-7 text-forest-700" />
              <h2 className="mt-4 font-display text-xl font-semibold">{b.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{b.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <h2 className="text-3xl font-semibold">Cum devii partener</h2>
            <ol className="mt-6 space-y-4">
              {process.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grain-300 text-sm font-semibold text-forest-900">
                    {i + 1}
                  </span>
                  <span className="pt-1 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-8 rounded-2xl bg-forest-50 p-4 text-sm leading-relaxed text-forest-800">
              Nu e nevoie să ai totul pregătit de la început. Dacă înregistrarea la DSV e în curs sau nu ai încă un adăpost
              potrivit, aplică oricum și discutăm ce e necesar.
            </p>
          </div>
          <PartnerForm />
        </div>
      </Container>
    </>
  );
}
