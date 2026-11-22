import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/forms/AuthForms";
import { roleHome } from "@/lib/roles";
import { site } from "@/lib/site";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Intră în cont", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/cont/autentificare">) {
  const { inapoi } = await searchParams;
  const returnTo = typeof inapoi === "string" && inapoi.startsWith("/") && !inapoi.startsWith("//") ? inapoi : undefined;
  const user = await getCurrentUser();
  if (user) redirect(returnTo ?? roleHome[user.role]);

  return (
    <Container className="flex max-w-md flex-col py-16 sm:py-24">
      <Breadcrumbs items={[{ label: "Intră în cont" }]} className="mb-6" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Contul meu</p>
      <h1 className="mt-3 text-3xl font-semibold">Intră în cont</h1>
      <p className="mt-2 text-muted">Pentru gospodarii partenerii, investitori și echipa Puii mei.</p>
      <div className="mt-8 rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-8">
        <LoginForm returnTo={returnTo} />
      </div>
      <p className="mt-6 text-sm text-muted">
        Nu ai cont sau ai uitat parola? Conturile se creează de echipa Puii mei. Scrie-ne la{" "}
        <a href={`mailto:${site.company.email}`} className="font-semibold text-forest-700 underline">{site.company.email}</a>.
      </p>
    </Container>
  );
}
