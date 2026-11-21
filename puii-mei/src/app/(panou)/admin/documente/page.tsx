import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { formatLei } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { documentRepository, expenseRepository, expenseTotals } from "@/server/repositories/documents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documente", robots: { index: false, follow: false } };

export default async function AdminDocumentsPage({ searchParams }: PageProps<"/admin/documente">) {
  const sp = await searchParams;
  const [farms, docs] = await Promise.all([farmRepository.listAll(), documentRepository.list()]);
  const farmNames = new Map(farms.map((f) => [f.slug, f.name]));
  const filter = typeof sp.stare === "string" ? sp.stare : "neverificate";
  const shown = filter === "toate" ? docs : docs.filter((d) => !d.verifiedAt);
  const totals = await Promise.all(farms.map(async (f) => ({ farm: f, ...expenseTotals(await expenseRepository.byFarm(f.slug)) })));

  return (
    <Container className="py-8">
      <h1>Documente și cheltuieli</h1>
      <p className="mt-1 text-sm text-slate-600">Verifică documentele încărcate de gospodării și registrele de cheltuieli.</p>

      <h2 className="mt-6 text-lg">Registre pe gospodării</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {totals.map((t) => (
          <Link key={t.farm.slug} href={`/cont/gospodar/documente?gospodarie=${t.farm.slug}`} className="rounded-xl bg-white p-4 ring-1 ring-slate-200 hover:ring-slate-400">
            <p className="font-semibold">{t.farm.name}</p>
            <p className="text-sm text-slate-600">{t.count} cheltuieli · {formatLei(t.total)}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg">Documente {filter === "toate" ? "" : "de verificat"}</h2>
        <div className="flex gap-2 text-sm">
          <Link href="?stare=neverificate" className={filter !== "toate" ? "font-semibold underline" : "underline"}>De verificat ({docs.filter((d) => !d.verifiedAt).length})</Link>
          <Link href="?stare=toate" className={filter === "toate" ? "font-semibold underline" : "underline"}>Toate ({docs.length})</Link>
        </div>
      </div>
      <div className="mt-3">
        <DocumentTable docs={shown} farmNames={farmNames} canVerify returnTo={`/admin/documente?stare=${filter}`} />
      </div>
    </Container>
  );
}
