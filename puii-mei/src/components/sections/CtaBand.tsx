import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function CtaBand({
  title = "Puii mei. Crescuți pentru tine.",
  text = "Rezervă acum din următorul lot. Nu plătești nimic online – te sunăm pentru confirmare.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-forest-800 px-6 py-14 text-center sm:px-12">
          <svg aria-hidden viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-24 w-full opacity-20">
            <path d="M0 80 C 80 50, 160 70, 240 55 S 360 45, 400 50 L400 120 L0 120Z" fill="#e8bd55" />
          </svg>
          <h2 className="relative text-3xl font-semibold text-cream-50 sm:text-4xl">{title}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-cream-100/80">{text}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/precomanda" size="lg">
              Vreau să comand
            </ButtonLink>
            <ButtonLink href="/cum-functioneaza" size="lg" variant="light">
              Cum funcționează?
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
