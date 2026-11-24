import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { formatLei } from "@/lib/format";
import { farmRepository } from "@/server/repositories/catalog";
import { documentRepository, expenseRepository, expenseTotals } from "@/server/repositories/documents";
import { storageStatus } from "@/server/files/migrate";
import { migrateFilesAction } from "./storage-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documente", robots: { index: false, follow: false } };

export default async function AdminDocumentsPage({ searchParams }: PageProps<"/admin/documente">) {
  const sp = await searchParams;
  const [farms, docs] = await Promise.all([farmRepository.listAll(), documentRepository.list()]);
  const farmNames = new Map(farms.map((f) => [f.slug, f.name]));
  const filter = typeof sp.stare === "string" ? sp.stare : "neverificate";
  const shown = filter === "toate" ? docs : docs.filter((d) => !d.verifiedAt);
  const totals = await Promise.all(farms.map(async (f) => ({ farm: f, ...expenseTotals(await expenseRepository.byFarm(f.slug)) })));
  const st = await storageStatus();
  const mb = (b: number) => (b / 1024 / 1024).toLocaleString("ro-RO", { maximumFractionDigits: 1 });

  return (
    <Container className="py-8">
      <h1>Documente și cheltuieli</h1>
      <p className="mt-1 text-sm text-slate-600">Verifică documentele încărcate de gospodării și registrele de cheltuieli.</p>

      <section id="stocare" className="mt-6 scroll-mt-6 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
        <h2 className="text-lg">Stocarea fișierelor (poze și documente)</h2>
        {st.enabled ? (
          <p className="mt-1">
            Fișierele noi se salvează în <strong>stocarea externă</strong> (privată; se văd doar prin aplicație). În stocarea
            externă: {st.external}. Încă în baza de date: <strong>{st.inDb}</strong> ({mb(st.inDbBytes)} MB).
          </p>
        ) : (
          <p className="mt-1">
            Stocarea externă <strong>nu e configurată</strong>: pozele și documentele se salvează în baza de date ({st.inDb} fișiere,{" "}
            {mb(st.inDbBytes)} MB) și consumă din spațiul ei. Se configurează din Vercel (variabilele FILES_S3_*).
          </p>
        )}
        {typeof sp.mutate === "string" && <p className="mt-2 rounded-lg bg-green-50 p-2 text-green-900">Mutate acum: {sp.mutate}. Rămase în baza de date: {sp.ramase}.</p>}
        {typeof sp.eroriMutare === "string" && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-red-800">{sp.eroriMutare}</p>}
        {st.enabled && st.inDb > 0 && (
          <form action={migrateFilesAction} className="mt-3">
            <button className="rounded-lg bg-forest-700 px-3 py-1.5 font-semibold text-white">Mută următoarele 25 de fișiere în stocarea externă</button>
            <p className="mt-1 text-xs text-slate-500">Fiecare fișier e verificat după mutare (amprenta SHA-256) înainte de a fi scos din baza de date.</p>
          </form>
        )}
      </section>

      <h2 className="mt-6 text-lg">Registre pe gospodării</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {totals.map((t) => (
          <Link key={t.farm.slug} href={`/cont/gospodar/documente?gospodarie=${t.farm.slug}`} className="rounded-xl bg-white p-4 ring-1 ring-slate-200 hover:ring-slate-400">
            <p className="font-semibold">{t.farm.name}</p>
            <p className="text-sm text-slate-600">Cheltuieli {formatLei(t.total)} · venituri {formatLei(t.income)}</p>
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
