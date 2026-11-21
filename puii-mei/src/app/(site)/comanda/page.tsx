import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { FindOrderForm } from "@/components/forms/FindOrderForm";

export const metadata: Metadata = {
  title: "Comanda mea",
  description: "Urmărește precomanda: plata avansului, evoluția lotului și livrarea.",
  alternates: { canonical: "/comanda" },
};

export default function FindOrderPage() {
  return (
    <Container className="max-w-xl py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Comanda mea</p>
      <h1 className="mt-2 text-4xl font-semibold">Urmărește precomanda</h1>
      <p className="mt-3 text-muted">
        Introdu numărul primit la precomandă și telefonul tău. Vezi plata avansului, evoluția lotului și livrarea.
      </p>
      <div className="mt-8">
        <FindOrderForm />
      </div>
    </Container>
  );
}
