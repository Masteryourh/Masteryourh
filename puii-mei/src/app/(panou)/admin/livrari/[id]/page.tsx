import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { TourDetail } from "@/components/delivery/TourDetail";
import { PhotoCompare } from "@/components/delivery/PhotoCompare";
import { ratingTargets } from "@/lib/delivery";
import { tourRepository } from "@/server/repositories/delivery";
import { loadTourView } from "@/server/tour-view";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tură", robots: { index: false, follow: false } };

export default async function AdminTourPage({ params }: PageProps<"/admin/livrari/[id]">) {
  const { id } = await params;
  const user = await requireUser(["admin"], `/admin/livrari/${id}`);
  const tour = await tourRepository.byId(id);
  if (!tour) notFound();
  const { stops } = await loadTourView(tour);
  return (
    <Container className="py-8">
      <Link href="/admin/livrari" className="text-sm text-muted">← Livrări live</Link>
      <div className="mt-4">
        <TourDetail tour={tour} user={user} />
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Colete: ridicare ↔ primire</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {stops.map(({ parcel, preorder }) => (
            <div key={parcel.id} className="rounded-3xl bg-white p-5 ring-1 ring-forest-900/10">
              <p className="font-mono font-semibold">{parcel.preorderNumber}</p>
              <p className="text-sm text-muted">
                {preorder?.customer.name} · {parcel.birds} pui
                {parcel.loaded ? ` · încărcat ${parcel.loaded.temp} °C` : ""}
                {parcel.delivered ? ` · predat ${parcel.delivered.temp} °C` : ""}
              </p>
              {parcel.answers && (
                <p className={`mt-2 text-sm font-semibold ${parcel.answers.conditionOk ? "text-forest-700" : "text-red-700"}`}>
                  Client: {parcel.answers.conditionOk ? "confirmat în condițiile promise" : `problemă – ${parcel.answers.problem}`} ({parcel.answers.birdsReceived}/{parcel.birds} pui)
                </p>
              )}
              {parcel.ratings && (
                <p className="mt-1 text-sm text-muted">
                  {ratingTargets.map((t) => `${t.label} ${parcel.ratings![t.key]}/5`).join(" · ")}
                  {parcel.ratings.comment ? ` · „${parcel.ratings.comment}”` : ""}
                </p>
              )}
              <div className="mt-3">
                <PhotoCompare loadIds={parcel.loaded?.photoIds} clientIds={parcel.answers?.photoIds} />
              </div>
              {parcel.delivered && (
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <a href={`/foto/${parcel.delivered.signaturePhotoId}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline">Semnătura clientului</a>
                  <a href={`/foto/${parcel.delivered.tempPhotoId}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline">Termometru la predare</a>
                  {parcel.delivered.lat && (
                    <a href={`https://www.google.com/maps?q=${parcel.delivered.lat},${parcel.delivered.lng}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline">Locul predării (GPS)</a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
