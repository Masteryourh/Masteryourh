import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { DeliverForm, LoadForm } from "@/components/delivery/CourierForms";
import { courierAuthorized } from "@/server/courier-session";
import { parcelRepository, tourRepository } from "@/server/repositories/delivery";
import { preorderRepository } from "@/server/repositories/preorders";
import { deliverAction, loadAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Colet", robots: { index: false, follow: false } };

const time = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

/** Deschisă din codul QR „CURIER” de pe eticheta coletului. */
export default async function CourierParcelPage({ params }: PageProps<"/livrare/c/[token]">) {
  const { token } = await params;
  const parcel = await parcelRepository.byCourierToken(token);
  if (!parcel) {
    const replaced = await parcelRepository.replacedBy(token);
    if (!replaced) notFound();
    return (
      <Container className="max-w-md py-12">
        <p role="alert" className="rounded-3xl bg-red-50 p-6 font-semibold text-red-800">
          Această etichetă a fost înlocuită (comanda {replaced.preorderNumber}). Folosește eticheta nouă de pe colet.
        </p>
      </Container>
    );
  }
  const tour = parcel.tourId ? await tourRepository.byId(parcel.tourId) : null;
  if (!tour || tour.status === "anulata") {
    return (
      <Container className="max-w-md py-12">
        <p className="rounded-3xl bg-white p-6 text-muted ring-1 ring-forest-900/10">
          Coletul {parcel.preorderNumber} nu este încă într-o tură de livrare.
        </p>
      </Container>
    );
  }
  if (!(await courierAuthorized(tour))) {
    return (
      <Container className="max-w-md py-12">
        <h1 className="text-2xl font-semibold">Colet {parcel.preorderNumber}</h1>
        <p className="mt-2 text-muted">Pentru a continua, intră în tura {tour.code} cu PIN-ul tău, apoi scanează din nou codul.</p>
        <Link href={`/livrare/${tour.token}`} className="mt-6 inline-block rounded-full bg-grain-400 px-6 py-3 font-semibold text-forest-900">
          Deschide tura
        </Link>
      </Container>
    );
  }
  const preorder = await preorderRepository.byId(parcel.id);

  return (
    <>
      <section className="border-b border-forest-900/5 bg-cream-100">
        <Container className="max-w-2xl py-6">
          <Link href={`/livrare/${tour.token}`} className="text-sm text-muted">← Tura {tour.code}</Link>
          <h1 className="mt-2 font-mono text-2xl font-semibold">{parcel.preorderNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {parcel.birds} pui · lot {parcel.lotCode} · {preorder?.customer.name}
          </p>
          {preorder?.address && <p className="text-sm text-muted">{preorder.address}</p>}
        </Container>
      </section>
      <Container className="max-w-2xl py-6">
        {tour.status === "planificata" ? (
          <p className="rounded-2xl bg-cream-100 p-4 text-sm font-semibold">
            Pornește întâi tura (verificarea mașinii), apoi scanează din nou coletul.{" "}
            <Link href={`/livrare/${tour.token}`} className="underline">Deschide tura</Link>
          </p>
        ) : !parcel.loaded ? (
          <>
            <h2 className="text-2xl font-semibold">Încărcare la ridicare</h2>
            <div className="mt-4">
              <LoadForm action={loadAction.bind(null, token)} />
            </div>
          </>
        ) : !parcel.delivered ? (
          <>
            <p className="mb-4 flex items-center gap-2 text-sm text-forest-800">
              <Icon name="check" className="h-4 w-4" /> Încărcat la {time.format(new Date(parcel.loaded.at))}, {parcel.loaded.temp} °C
            </p>
            <h2 className="text-2xl font-semibold">Predare la client</h2>
            {preorder?.customer.phone && (
              <a href={`tel:${preorder.customer.phone}`} className="mt-2 inline-block text-sm font-semibold text-forest-700 underline">
                Sună clientul: {preorder.customer.phone}
              </a>
            )}
            <div className="mt-4">
              <DeliverForm action={deliverAction.bind(null, token)} />
            </div>
          </>
        ) : (
          <div role="status" className="rounded-3xl bg-forest-50 p-6">
            <p className="flex items-center gap-2 text-lg font-semibold text-forest-800">
              <Icon name="check" className="h-5 w-5" /> Predat la {time.format(new Date(parcel.delivered.at))}
            </p>
            <p className="mt-2 text-sm text-forest-800">
              Clientul confirmă acum primirea cu codul QR „CLIENT” de pe colet.
            </p>
            <Link href={`/livrare/${tour.token}`} className="mt-4 inline-block rounded-full bg-grain-400 px-6 py-3 font-semibold text-forest-900">
              Înapoi la traseu
            </Link>
          </div>
        )}
      </Container>
    </>
  );
}
