import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { InterestForm } from "@/components/forms/InterestForm";
import { UpcomingProductGrid } from "@/components/sections/UpcomingProducts";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "În curând: curcani, rațe, fazani și legume din seră",
  description:
    "Puii mei se extinde cu curcani, rațe, fazani și legume din seră, în funcție de gospodăriile din fiecare regiune. Lasă-ne datele și te anunțăm când ajung în zona ta.",
  path: "/in-curand",
});

export default function UpcomingPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "În curând" }]}
        eyebrow="În curând"
        title="Mai mult decât pui"
        intro="Începem cu puii, în Bucovina. Urmează curcani, rațe, fazani și legume din seră. Ce ajunge în zona ta depinde de gospodăriile partenere din regiune și de interesul celor din jur."
      />
      <Container className="py-14 sm:py-20">
        <UpcomingProductGrid />
        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold">Anunță-mă când ajung în zona mea</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Alege produsele care te interesează și județul tău. Ne ajută să decidem unde și cu ce pornim primele loturi.
            </p>
          </div>
          <InterestForm />
        </div>
      </Container>
    </>
  );
}
