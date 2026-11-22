import { PanelShell } from "@/components/panel/PanelShell";
import { applicationRepository, investorRepository } from "@/server/repositories/applications";
import { requireUser } from "@/server/session";
import { lotRepository } from "@/server/repositories/catalog";
import Link from "next/link";
import { AlertWatcher } from "@/components/admin/AlertWatcher";
import { adminAlerts } from "@/server/admin-alerts";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser(["admin"], "/admin");
  const [apps, investors] = await Promise.all([applicationRepository.list(), investorRepository.list()]);
  const newApplications = [...apps, ...investors].filter((a) => a.status === "noua").length;
  const pendingLots = (await lotRepository.list({ all: true })).filter((l) => l.approval?.status === "asteapta").length;
  const alerts = await adminAlerts();
  return (
    <PanelShell
      user={user}
      title="Panou de administrare"
      home="/admin"
      items={[
        { href: "/admin", label: "Precomenzi", exact: true },
        { href: "/admin/loturi", label: "Loturi", badge: pendingLots },
        { href: "/admin/livrari", label: "Livrări live", badge: alerts.filter((a) => a.kind === "prelungire").length },
        { href: "/admin/monitorizare", label: "Monitorizare creștere", badge: alerts.filter((a) => a.kind === "crestere").length },
        { href: "/admin/calitate", label: "Calitate" },
        { href: "/admin/documente", label: "Documente" },
        { href: "/admin/investitii", label: "Investiții" },
        { href: "/admin/parteneri", label: "Solicitări parteneri", badge: newApplications },
        { href: "/admin/gospodarii", label: "Gospodării" },
        { href: "/admin/preturi", label: "Prețuri" },
        { href: "/admin/zone", label: "Zone de livrare" },
        { href: "/admin/interes", label: "Interes produse" },
        { href: "/admin/utilizatori", label: "Utilizatori" },
        { href: "/admin/legislatie", label: "Legislație și surse" },
        { href: "/cont/gospodar", label: "Vedere gospodar" },
      ]}
    >
      {alerts.length > 0 && (
        <div role="alert" className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-950 sm:px-6 lg:px-8">
          <p className="font-semibold">
            🔔 {alerts.length === 1 ? "O alertă cere atenția ta" : `${alerts.length} alerte cer atenția ta`}
          </p>
          <ul className="mt-1 space-y-0.5">
            {alerts.slice(0, 3).map((a) => (
              <li key={a.id}>
                {a.kind === "crestere" ? "Monitorizare: " : "Prelungire: "}
                {a.text} ·{" "}
                <Link href={a.href} className="font-semibold underline">
                  {a.kind === "crestere" ? "Vezi jurnalul" : "Decide"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
      <AlertWatcher initial={alerts.map((a) => a.id)} />
    </PanelShell>
  );
}
