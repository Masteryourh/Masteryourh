import { Container } from "@/components/ui/Container";
import { AdminNav } from "@/components/admin/AdminNav";
import { AccountBar } from "@/components/account/AccountBar";
import { applicationRepository, investorRepository } from "@/server/repositories/applications";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser(["admin"], "/admin");
  const [apps, investors] = await Promise.all([applicationRepository.list(), investorRepository.list()]);
  return (
    <>
      <div className="border-b border-forest-900/5 bg-cream-100">
        <Container className="py-5">
          <AccountBar user={user} title="Panou de administrare" />
          <div className="mt-3">
            <AdminNav newApplications={[...apps, ...investors].filter((a) => a.status === "noua").length} />
          </div>
        </Container>
      </div>
      {children}
    </>
  );
}
