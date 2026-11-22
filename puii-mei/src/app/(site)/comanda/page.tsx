import Link from "next/link";
import { currentOrderAccess } from "@/server/order-access";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { FindOrderForm } from "@/components/forms/FindOrderForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Comanda mea",
  description: "Urmărește precomanda: plata avansului, evoluția lotului și livrarea.",
  alternates: { canonical: "/comanda" },
};

export default async function FindOrderPage({ searchParams }: PageProps<"/comanda">) {
  const { nr } = await searchParams;
  const current = await currentOrderAccess();
  return (
    <Container className="max-w-xl py-12 sm:py-16">
      <Breadcrumbs items={[{ label: "Comanda mea" }]} className="mb-6" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Comanda mea</p>
      <h1 className="mt-2 text-4xl font-semibold">Urmărește precomanda</h1>
      <p className="mt-3 text-muted">
        Introdu numărul precomenzii; îți trimitem un PIN pe telefon, valabil 24 de ore. Vezi trasabilitatea completă, contractul, plățile, jurnalul de creștere cu poze și livrarea.
      </p>
      {current && (
        <div className="mt-6 rounded-2xl bg-forest-50 p-4 text-sm text-forest-800">
          Ești deja conectat la comanda <strong className="font-mono">{current.number}</strong>.{" "}
          <Link href={`/comanda/${current.token}`} className="font-semibold underline">Continuă la panoul comenzii</Link>
        </div>
      )}
      <div className="mt-8">
        <FindOrderForm number={typeof nr === "string" ? nr : undefined} />
      </div>
    </Container>
  );
}
