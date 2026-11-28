import { PanelShell } from "@/components/panel/PanelShell";
import { applicationRepository, investorRepository } from "@/server/repositories/applications";
import { requireUser } from "@/server/session";
import { lotRepository } from "@/server/repositories/catalog";
import Link from "next/link";
import { AlertWatcher } from "@/components/admin/AlertWatcher";
import { adminAlerts } from "@/server/admin-alerts";
import { unsentMessages } from "@/server/outbox";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser(["admin"], "/admin");
  const [apps, investors] = await Promise.all([applicationRepository.list(), investorRepository.list()]);
  const newApplications = [...apps, ...investors].filter((a) => a.status === "noua").length;
  const pendingLots = (await lotRepository.list({ all: true })).filter((l) => l.approval?.status === "asteapta").length;
  const alerts = await adminAlerts();
  const deadMessages = (await unsentMessages()).filter((m) => m.status === "dead").length;
  return (
    <PanelShell
      user={user}
      title="Panou de administrare"
      home="/admin"
      rail
      items={[
        { href: "/admin/azi", label: "Astăzi", icon: "azi", tab: true, group: "Principal" },
        { href: "/admin", label: "Precomenzi", exact: true, icon: "comenzi", tab: true, short: "Comenzi", group: "Principal" },
        { href: "/admin/loturi", label: "Loturi", badge: pendingLots, icon: "loturi", tab: true, group: "Principal" },
        { href: "/admin/livrari", label: "Livrări live", badge: alerts.filter((a) => a.kind === "prelungire").length, icon: "livrari", tab: true, short: "Livrări", group: "Principal" },
        { href: "/admin/monitorizare", label: "Monitorizare creștere", badge: alerts.filter((a) => a.kind === "crestere").length, icon: "crestere", group: "Creștere" },
        { href: "/admin/calitate", label: "Calitate", icon: "calitate", group: "Creștere" },
        { href: "/admin/documente", label: "Documente", icon: "documente", group: "Creștere" },
        { href: "/admin/investitii", label: "Investiții", icon: "investitii", group: "Afacere" },
        { href: "/admin/parteneri", label: "Solicitări parteneri", badge: newApplications, icon: "parteneri", group: "Afacere" },
        { href: "/admin/gospodarii", label: "Gospodării", icon: "gospodarii", group: "Creștere" },
        { href: "/admin/preturi", label: "Prețuri", icon: "preturi", group: "Afacere" },
        { href: "/admin/zone", label: "Zone de livrare", icon: "zone", group: "Afacere" },
        { href: "/admin/interes", label: "Interes produse", icon: "interes", group: "Afacere" },
        { href: "/admin/utilizatori", label: "Utilizatori", icon: "utilizatori", group: "Sistem" },
        { href: "/admin/legislatie", label: "Legislație și surse", icon: "legislatie", group: "Sistem" },
        { href: "/admin/mesaje", label: "Mesaje netrimise", badge: deadMessages, icon: "mesaje", group: "Sistem" },
        { href: "/admin/diagnostic", label: "Diagnostic tehnic", icon: "diagnostic", group: "Sistem" },
        // nav-permis: schimbare EXPLICITĂ de spațiu (NAV-06); în spațiul gospodarului apare bannerul „Înapoi în Admin”.
        { href: "/cont/gospodar", label: "Schimbă spațiul: vedere gospodar", icon: "vedere", group: "Sistem" },
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
