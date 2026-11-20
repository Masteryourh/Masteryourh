import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Label } from "@/components/delivery/LabelSheet";
import { PrintButton } from "@/components/admin/PrintButton";
import { canManageFarm, requestOrigin } from "@/server/delivery";
import { parcelRepository, tourRepository } from "@/server/repositories/delivery";
import { preorderRepository } from "@/server/repositories/preorders";
import { zoneRepository } from "@/server/repositories/catalog";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Etichete colete", robots: { index: false, follow: false } };

/** Tipărirea etichetelor: ?ids=a,b sau ?tura=<id> (toate coletele turei). */
export default async function LabelsPage({ searchParams }: PageProps<"/cont/gospodar/etichete">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar");
  const sp = await searchParams;
  let ids = typeof sp.ids === "string" ? sp.ids.split(",").filter(Boolean) : [];
  if (typeof sp.tura === "string") ids = (await tourRepository.byId(sp.tura))?.parcelIds ?? [];
  const [origin, zones] = await Promise.all([requestOrigin(), zoneRepository.listActive()]);
  const parcels = (await Promise.all(ids.map((id) => parcelRepository.byId(id)))).filter(
    (p): p is NonNullable<typeof p> => Boolean(p && canManageFarm(user, p.farmSlug)),
  );

  return (
    <Container className="py-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <Link href="/cont/gospodar" className="text-sm text-muted">← Contul gospodarului</Link>
          <h1 className="mt-1 text-2xl font-semibold">Etichete ({parcels.length})</h1>
          <p className="max-w-lg text-sm text-muted">
            Tipărește și lipește câte o etichetă pe fiecare colet. Etichetele sunt salvate automat la comandă și apar în
            admin.
          </p>
        </div>
        <PrintButton label="Tipărește etichetele" />
      </div>
      {parcels.length === 0 && <p className="text-muted">Nicio etichetă de afișat.</p>}
      <div className="space-y-6 print:space-y-0">
        {parcels.map(async (p) => {
          const preorder = await preorderRepository.byId(p.id);
          const zone = zones.find((z) => z.id === preorder?.zoneId)?.name ?? "";
          return <Label key={p.id} parcel={p} preorder={preorder} zone={zone} origin={origin} />;
        })}
      </div>
    </Container>
  );
}
