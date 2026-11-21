import { PanelShell } from "@/components/panel/PanelShell";
import { applicationRepository, investorRepository } from "@/server/repositories/applications";
import { requireUser } from "@/server/session";
import { lotRepository } from "@/server/repositories/catalog";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser(["admin"], "/admin");
  const [apps, investors] = await Promise.all([applicationRepository.list(), investorRepository.list()]);
  const newApplications = [...apps, ...investors].filter((a) => a.status === "noua").length;
  const pendingLots = (await lotRepository.list({ all: true })).filter((l) => l.approval?.status === "asteapta").length;
  return (
    <PanelShell
      user={user}
      title="Panou de administrare"
      home="/admin"
      items={[
        { href: "/admin", label: "Precomenzi", exact: true },
        { href: "/admin/loturi", label: "Loturi", badge: pendingLots },
        { href: "/admin/livrari", label: "Livrări live" },
        { href: "/admin/calitate", label: "Calitate" },
        { href: "/admin/documente", label: "Documente" },
        { href: "/admin/investitii", label: "Investiții" },
        { href: "/admin/parteneri", label: "Solicitări parteneri", badge: newApplications },
        { href: "/admin/gospodarii", label: "Gospodării" },
        { href: "/admin/interes", label: "Interes produse" },
        { href: "/admin/utilizatori", label: "Utilizatori" },
        { href: "/admin/legislatie", label: "Legislație și surse" },
        { href: "/cont/gospodar", label: "Vedere gospodar" },
      ]}
    >
      {children}
    </PanelShell>
  );
}
