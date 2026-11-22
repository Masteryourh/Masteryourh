import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { FindOrderForm } from "@/components/forms/FindOrderForm";
import { ClientFrame } from "@/components/orders/ClientFrame";

export const metadata: Metadata = { title: "Ai ieșit din comandă", robots: { index: false, follow: false } };

/** După „Ieșire” din panoul clientului: rămâi în panou, poți intra din nou cu numărul + PIN. */
export default function LoggedOutPage() {
  return (
    <ClientFrame>
      <Container className="max-w-xl py-12 sm:py-16">
        <h1 className="text-3xl font-semibold">Ai ieșit din comandă</h1>
        <p className="mt-3 text-[var(--pd-muted)]">Ca să intri din nou, scrie numărul precomenzii; îți trimitem un PIN nou, valabil 24 de ore.</p>
        <div className="mt-8"><FindOrderForm /></div>
      </Container>
    </ClientFrame>
  );
}
