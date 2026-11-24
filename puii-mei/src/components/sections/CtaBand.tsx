import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function CtaBand({
  title = "Puii mei. Crescuți pentru tine.",
  text = "Rezervă acum din următorul lot. Te sunăm pentru confirmare și îți spunem detaliile avansului (pui de o zi + furaj), care se scade din prețul total.",
  showHowItWorks = true,
}: {
  title?: string;
  text?: string;
  /** Fals pe pagina „Cum funcționează” (butonul ar trimite la aceeași pagină). */
  showHowItWorks?: boolean;
}) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-forest-800 px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/poveste/7-masa.webp" alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-forest-900/70" />
          <h2 className="relative text-title text-cream-50">{title}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-cream-100/80">{text}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/precomanda" size="lg">
              Vreau să comand
            </ButtonLink>
            {showHowItWorks && (
              <ButtonLink href="/cum-functioneaza" size="lg" variant="light">
                Cum funcționează?
              </ButtonLink>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
