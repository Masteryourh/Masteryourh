import type { Metadata } from "next";
import { LabelsView } from "@/components/delivery/LabelsView";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Etichete colete (admin)", robots: { index: false, follow: false } };

/** Etichetele coletelor, în spațiul Admin (CORE: fiecare entitate are reprezentare în Admin). */
export default async function AdminLabelsPage({ searchParams }: PageProps<"/admin/livrari/etichete">) {
  const user = await requireUser(["admin"], "/admin/livrari");
  const sp = await searchParams;
  return <LabelsView user={user} ids={typeof sp.ids === "string" ? sp.ids : undefined} tour={typeof sp.tura === "string" ? sp.tura : undefined} />;
}
