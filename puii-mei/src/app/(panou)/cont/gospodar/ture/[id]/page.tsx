import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { TourDetail } from "@/components/delivery/TourDetail";
import { canManageFarm } from "@/server/delivery";
import { tourRepository } from "@/server/repositories/delivery";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tură de livrare", robots: { index: false, follow: false } };

export default async function FarmerTourPage({ params, searchParams }: PageProps<"/cont/gospodar/ture/[id]">) {
  const { id } = await params;
  const { cerere } = await searchParams;
  const user = await requireUser(["gospodar"], `/cont/gospodar/ture/${id}`);
  const tour = await tourRepository.byId(id);
  if (!tour || !canManageFarm(user, tour.farmSlug)) notFound();
  return (
    <Container className="py-8">
      <div>
        <TourDetail tour={tour} user={user} highlightRequest={typeof cerere === "string" ? cerere : undefined} />
      </div>
    </Container>
  );
}
