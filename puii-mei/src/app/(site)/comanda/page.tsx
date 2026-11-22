import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { FindOrderForm } from "@/components/forms/FindOrderForm";

export const metadata: Metadata = {
  title: "Comanda mea",
  description: "Urmărește precomanda: plata avansului, evoluția lotului și livrarea.",
  alternates: { canonical: "/comanda" },
};

export default async function FindOrderPage({ searchParams }: PageProps<"/comanda">) {
  const { nr } = await searchParams;
  return (
    <Container className="max-w-xl py-12 sm:py-16">
      <Breadcrumbs items={[{ label: "Comanda mea" }]} className="mb-6" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Comanda mea</p>
      <h1 className="mt-2 text-4xl font-semibold">Urmărește precomanda</h1>
      <p className="mt-3 text-muted">
        Introdu numărul precomenzii; îți trimitem un PIN pe telefon, valabil 24 de ore. Vezi trasabilitatea completă, contractul, plățile, jurnalul de creștere cu poze și livrarea.
      </p>
      <div className="mt-8">
        <FindOrderForm number={typeof nr === "string" ? nr : undefined} />
      </div>
    </Container>
  );
}
