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
      rail
      items={[
        { href: "/admin", label: "Precomenzi", exact: true, icon: "comenzi" },
        { href: "/admin/loturi", label: "Loturi", badge: pendingLots, icon: "loturi" },
        { href: "/admin/livrari", label: "Livrări live", badge: alerts.filter((a) => a.kind === "prelungire").length, icon: "livrari" },
        { href: "/admin/monitorizare", label: "Monitorizare creștere", badge: alerts.filter((a) => a.kind === "crestere").length, icon: "crestere" },
        { href: "/admin/calitate", label: "Calitate", icon: "calitate" },
        { href: "/admin/documente", label: "Documente", icon: "documente" },
        { href: "/admin/investitii", label: "Investiții", icon: "investitii" },
        { href: "/admin/parteneri", label: "Solicitări parteneri", badge: newApplications, icon: "parteneri" },
        { href: "/admin/gospodarii", label: "Gospodării", icon: "gospodarii" },
        { href: "/admin/preturi", label: "Prețuri", icon: "preturi" },
        { href: "/admin/zone", label: "Zone de livrare", icon: "zone" },
        { href: "/admin/interes", label: "Interes produse", icon: "interes" },
        { href: "/admin/utilizatori", label: "Utilizatori", icon: "utilizatori" },
        { href: "/admin/legislatie", label: "Legislație și surse", icon: "legislatie" },
        { href: "/cont/gospodar", label: "Vedere gospodar", icon: "vedere" },
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
                {a.kind === "crestere" ? "Monitorizare: " : a.kind === "document" ? "Document: " : "Prelungire: "}
                {a.text} ·{" "}
                <Link href={a.href} className="font-semibold underline">
                  {a.kind === "crestere" ? "Vezi jurnalul" : a.kind === "document" ? "Vezi documentele" : "Decide"}
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
