import type { Metadata } from "next";
import { LabelsView } from "@/components/delivery/LabelsView";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Etichete colete", robots: { index: false, follow: false } };

/** Tipărirea etichetelor: ?ids=a,b sau ?tura=<id> (toate coletele turei). */
export default async function LabelsPage({ searchParams }: PageProps<"/cont/gospodar/etichete">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar");
  const sp = await searchParams;
  return <LabelsView user={user} ids={typeof sp.ids === "string" ? sp.ids : undefined} tour={typeof sp.tura === "string" ? sp.tura : undefined} />;
}
