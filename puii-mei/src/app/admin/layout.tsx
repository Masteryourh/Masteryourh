import { Container } from "@/components/ui/Container";
import { AdminNav } from "@/components/admin/AdminNav";
import { applicationRepository, investorRepository } from "@/server/repositories/applications";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [apps, investors] = await Promise.all([applicationRepository.list(), investorRepository.list()]);
  return (
    <>
      <div className="border-b border-forest-900/5 bg-cream-100">
        <Container className="py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">Panou de administrare</p>
          <div className="mt-3">
            <AdminNav newApplications={[...apps, ...investors].filter((a) => a.status === "noua").length} />
          </div>
        </Container>
      </div>
      {children}
    </>
  );
}
