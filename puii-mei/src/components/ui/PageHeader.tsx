import { Container } from "./Container";
import { SectionHeading } from "./SectionHeading";

export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-forest-900/5 bg-cream-100">
      {/* Peisajul din Bucovina, discret, în spatele titlului */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/poveste/hero-mic.webp" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_70%] opacity-90" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-cream-50)_97%,transparent)_0%,color-mix(in_oklab,var(--color-cream-50)_90%,transparent)_45%,color-mix(in_oklab,var(--color-cream-50)_35%,transparent)_100%)]" />
      <Container className="py-16 sm:py-24">
        <div className="animate-fade-up">
          <SectionHeading as="h1" eyebrow={eyebrow} title={title} intro={intro} />
          {children && <div className="mt-8">{children}</div>}
        </div>
      </Container>
    </section>
  );
}
