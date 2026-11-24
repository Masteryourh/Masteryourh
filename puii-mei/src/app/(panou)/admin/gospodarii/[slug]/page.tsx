import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { inputClasses } from "@/components/forms/Field";
import { farmRepository } from "@/server/repositories/catalog";
import { saveFarm, toggleFarmActive } from "../../partner-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editare gospodărie", robots: { index: false, follow: false } };

export default async function EditFarmPage({ params, searchParams }: PageProps<"/admin/gospodarii/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const farm = await farmRepository.bySlug(slug, { includeInactive: true });
  if (!farm) notFound();

  return (
    <Container className="max-w-3xl py-8">
      <h1 className="mt-3 text-3xl font-semibold">{farm.name}</h1>
      <p className="mt-1 text-sm text-muted">
        Adresă pe site: <Link href={`/gospodarii/${farm.slug}`} className="font-mono text-forest-700 underline">/gospodarii/{farm.slug}</Link>
        {!farm.active && " (ascunsă)"}
      </p>
      <p className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link href={`/admin/gospodarii/${farm.slug}/jurnal?inapoi=${encodeURIComponent(`/admin/gospodarii/${farm.slug}`)}`} className="rounded-full px-4 py-1.5 font-semibold text-forest-700 ring-1 ring-forest-900/15">
          Jurnal de creștere
        </Link>
        <Link href={`/admin/gospodarii/${farm.slug}/regim`} className="rounded-full px-4 py-1.5 font-semibold text-forest-700 ring-1 ring-forest-900/15">
          Regim și suprafață
        </Link>
      </p>
      {farm.source === "demo" && (
        <p className="mt-3 rounded-2xl bg-cream-100 p-3 text-sm text-muted">
          Gospodărie demonstrativă: modificările se salvează în baza de date, peste datele din cod. Schimbarea localității schimbă
          și prefixul codurilor de lot noi (ex. Moldova-Sulița → MS).
        </p>
      )}

      {sp.nou && <Notice tone="ok">Profilul a fost creat din solicitare și e vizibil pe site. Completează descrierea și practicile.</Notice>}
      {sp.salvat && <Notice tone="ok">Modificările au fost salvate.</Notice>}
      {typeof sp.eroare === "string" && <Notice tone="error">{sp.eroare}</Notice>}

      <form action={saveFarm} className="mt-6 grid gap-5 rounded-3xl bg-white p-6 ring-1 ring-forest-900/10 sm:grid-cols-2 sm:p-8">
        <input type="hidden" name="slug" value={farm.slug} />
        <AdminField label="Numele gospodăriei" className="sm:col-span-2">
          <input name="name" defaultValue={farm.name} required className={inputClasses} />
        </AdminField>
        <AdminField label="Proprietar / familie">
          <input name="owner" defaultValue={farm.owner} required className={inputClasses} />
        </AdminField>
        <AdminField label="Capacitate pe lot (pui)">
          <input name="capacityPerLot" type="number" min={1} defaultValue={farm.capacityPerLot} required className={inputClasses} />
        </AdminField>
        <AdminField label="Localitate">
          <input name="village" defaultValue={farm.village} required className={inputClasses} />
        </AdminField>
        <AdminField label="Județ">
          <input name="county" defaultValue={farm.county} required className={inputClasses} />
        </AdminField>
        <AdminField label="Descriere scurtă (apare pe card)" className="sm:col-span-2">
          <textarea name="shortDescription" defaultValue={farm.shortDescription} rows={2} maxLength={220} required className={inputClasses} />
        </AdminField>
        <AdminField label="Descriere completă" className="sm:col-span-2">
          <textarea name="description" defaultValue={farm.description} rows={5} required className={inputClasses} />
        </AdminField>
        <AdminField label="Practici de creștere (câte una pe rând)" className="sm:col-span-2">
          <textarea name="practices" defaultValue={farm.practices.join("\n")} rows={4} className={inputClasses} />
        </AdminField>
        <AdminField label="Înregistrare sanitar-veterinară" className="sm:col-span-2">
          <input name="veterinaryRegistration" defaultValue={farm.veterinaryRegistration} className={inputClasses} />
        </AdminField>
        <div className="sm:col-span-2">
          <button className="rounded-full bg-forest-700 px-6 py-3 font-semibold text-white">Salvează modificările</button>
        </div>
      </form>

      <div className="mt-6 rounded-3xl bg-cream-100 p-6 text-sm">
        <p className="font-semibold text-forest-900">Fotografii</p>
        <p className="mt-1 text-muted">
          Adaugă în proiect, în <code className="font-mono">public/images/gospodarii/</code>, fișierele{" "}
          {farm.photos.map((p, i) => (
            <span key={p.src}>
              <code className="font-mono">{p.src.split("/").at(-1)}</code>
              {i < farm.photos.length - 1 ? ", " : "."}
            </span>
          ))}{" "}
          Până atunci se afișează imagini de rezervă.
        </p>
      </div>

      <form action={toggleFarmActive} className="mt-6">
        <input type="hidden" name="slug" value={farm.slug} />
        <button className="rounded-full px-5 py-2.5 text-sm font-semibold text-forest-800 ring-1 ring-forest-900/15 hover:bg-white">
          {farm.active ? "Ascunde gospodăria de pe site" : "Afișează gospodăria pe site"}
        </button>
      </form>
    </Container>
  );
}

function AdminField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-forest-900">{label}</span>
      {children}
    </label>
  );
}

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p role="status" className={tone === "ok" ? "mt-5 rounded-2xl bg-forest-50 p-4 text-sm text-forest-800" : "mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800"}>
      {children}
    </p>
  );
}
