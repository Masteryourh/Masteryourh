import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contul investitorului", robots: { index: false, follow: false } };

const sections = [
  { title: "Investițiile tale", text: "Suma, data, obiectul investiției și stadiul fiecărui proiect susținut." },
  { title: "Contracte și acte", text: "Contractele semnate și documentele aferente, descărcabile oricând." },
  { title: "Cronologie", text: "Evenimentele importante, de la semnare până la loturile și gospodăriile finanțate." },
];

export default async function InvestorDashboard() {
  const user = await requireUser(["investitor"], "/cont/investitor");
  return (
    <Container className="max-w-4xl py-8">
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Bun venit, {user.name.split(" ")[0]}!</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Aici vei urmări investițiile tale în rețeaua Puii mei, cu documentele și evoluția fiecăreia. Le adăugăm pe măsură
        ce sunt semnate.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <div key={s.title} className="rounded-3xl border border-dashed border-forest-900/20 p-5">
            <span className="rounded-full bg-grain-300/60 px-2.5 py-0.5 text-xs font-semibold">În curând</span>
            <p className="mt-3 font-semibold text-forest-900">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-3xl bg-cream-100 p-6 text-sm">
        <p className="font-semibold text-forest-900">Datele contului</p>
        <p className="mt-1 text-muted">
          {user.email}
          {user.phone ? ` · ${user.phone}` : ""}
        </p>
        <p className="mt-3 text-muted">
          Pentru orice întrebare despre investiții, scrie-ne la{" "}
          <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>.
        </p>
      </div>
    </Container>
  );
}
