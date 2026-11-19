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
    <section className="border-b border-forest-900/5 bg-cream-100">
      <Container className="py-14 sm:py-20">
        <div className="animate-fade-up">
          <SectionHeading as="h1" eyebrow={eyebrow} title={title} intro={intro} />
          {children && <div className="mt-8">{children}</div>}
        </div>
      </Container>
    </section>
  );
}
