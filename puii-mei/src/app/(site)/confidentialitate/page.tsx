import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Politica de confidențialitate",
  description: "Cum prelucrează Puii mei datele personale ale clienților, conform GDPR.",
  path: "/confidentialitate",
});

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Confidențialitate" }]} eyebrow="Informații legale" title="Politica de confidențialitate" />
      <Container className="max-w-3xl py-14">
        <div className="space-y-6 leading-relaxed text-ink/85 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold">
          <p className="rounded-2xl bg-grain-300/30 p-4 text-sm">
            Document în lucru pentru faza pilot. Versiunea finală va fi revizuită juridic înainte de lansarea comercială.
          </p>
          <p>
            {site.company.legalName} („Puii mei”) prelucrează datele tale personale în conformitate cu Regulamentul (UE)
            2016/679 (GDPR) și legislația națională aplicabilă.
          </p>
          <h2>Ce date colectăm</h2>
          <p>Nume, număr de telefon, adresă de email, adresa de livrare și detaliile precomenzii sau ale mesajului trimis.</p>
          <h2>De ce le folosim</h2>
          <p>
            Pentru gestionarea precomenzilor (confirmare, alocare pe lot, livrare), pentru a răspunde mesajelor și, doar
            cu acordul tău separat, pentru a-ți trimite noutăți despre loturile noi.
          </p>
          <h2>Cât timp le păstrăm</h2>
          <p>Pe durata relației comerciale și ulterior, pe perioadele impuse de legislația fiscală și contabilă.</p>
          <h2>Drepturile tale</h2>
          <p>
            Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a
            depune plângere la ANSPDCP. Pentru exercitarea drepturilor, scrie-ne la{" "}
            <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>.
          </p>
        </div>
      </Container>
    </>
  );
}
