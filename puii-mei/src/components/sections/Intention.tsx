import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";

const support: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "shield",
    title: "Intrarea în legalitate",
    text: "Înregistrarea ca producător local, atestatul de producător, autorizațiile sanitar-veterinare și toate actele necesare.",
  },
  {
    icon: "clipboard",
    title: "Taxe și contabilitate",
    text: "Evidența contabilă, declarațiile și taxele, ținute la zi, fără griji pentru gospodar.",
  },
  {
    icon: "check",
    title: "Plăți și facturare",
    text: "Încasarea avansurilor și a plăților de la clienți, cu documente corecte pentru fiecare vânzare.",
  },
  {
    icon: "chart",
    title: "Gestiune și administrare",
    text: "Evidența loturilor, a hranei și a costurilor, până la administrarea completă a noului producător local.",
  },
];

/** „De ce am pornit Puii mei” – intenția proiectului și programul pentru gospodari. */
export function Intention() {
  return (
    <section id="intentie" className="scroll-mt-24 py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Intenția noastră</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Munca din gospodărie merită să devină un venit stabil</h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-ink/85">
            <p>
              În satele din Bucovina sunt oameni harnici și gospodării bine rânduite. Munca de acolo aduce însă rar un
              venit pe măsură: produsele se vând ocazional, fără acte și fără un plan, iar câștigul rămâne mic.
            </p>
            <p>
              De aceea, mulți gospodari aleg un loc de muncă la oraș sau în altă țară, iar gospodăria rămâne fără cine
              să o îngrijească. În același timp, firmele caută oameni și nu îi găsesc.
            </p>
            <p className="font-medium text-forest-900">
              Puii mei pornește de la o idee simplă: gospodăria poate deveni o mică afacere de familie, legală și
              stabilă, fără ca gospodarul să plece de acasă.
            </p>
          </div>
        </div>

        <div className="mt-14 rounded-[2rem] bg-forest-900 p-6 sm:p-10">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-semibold text-cream-50 sm:text-3xl">Programul pentru gospodari</h3>
            <p className="mt-3 leading-relaxed text-cream-100/80">
              Fiecare gospodar din program are un contract de consultanță clar, făcut pentru situația lui. Îl sprijinim
              pe tot drumul, de la intrarea în legalitate până la administrarea completă a gospodăriei ca producător
              local.
            </p>
          </div>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {support.map((s, i) => (
              <li key={s.title} className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-grain-400 text-forest-900">
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                  <span className="font-display text-2xl font-semibold text-grain-300">{i + 1}</span>
                </div>
                <p className="mt-4 font-semibold text-cream-50">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-cream-100/75">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-white/10 pt-5 text-sm text-cream-100/70">
            Gospodarul rămâne proprietarul și producătorul. Puii mei oferă consultanța, pe bază de contract.
          </p>
        </div>
      </Container>
    </section>
  );
}
