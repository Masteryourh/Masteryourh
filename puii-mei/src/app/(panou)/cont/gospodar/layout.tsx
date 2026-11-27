import Link from "next/link";
import { PanelShell } from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function FarmerLayout({ children }: LayoutProps<"/cont/gospodar">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar");
  const items: PanelNavItem[] = [
    { href: "/cont/gospodar", label: "Gospodăria mea", short: "Azi", icon: "gospodarii", exact: true, tab: true },
    { href: "/cont/gospodar/jurnal", label: "Jurnal de creștere", short: "Jurnal", icon: "crestere", tab: true },
    { href: "/cont/gospodar/documente", label: "Documente și cheltuieli", short: "Documente", icon: "documente", tab: true },
    { href: "/cont/gospodar/legislatie", label: "Legislație și reguli", short: "Reguli", icon: "legislatie", tab: true },
    { href: "/cont/gospodar/securitate", label: "Securitate", icon: "securitate" },
  ];
  // nav-permis: întoarcerea explicită în Admin (doar pentru administrator).
  if (user.role === "admin") items.push({ href: "/admin", label: "← Panou admin", icon: "inapoi" });
  return (
    <PanelShell user={user} title="Contul gospodarului" home="/cont/gospodar" items={items} rail>
      {user.role === "admin" && (
        // NAV-06: trecerea Admin → spațiul gospodarului e explicită și vizibilă; adminul nu devine gospodar.
        <div role="status" data-workspace-banner className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm text-white sm:mx-6 lg:mx-8">
          <span>Ești <strong>administrator</strong> în spațiul gospodarului (vedere de verificare).</span>
          {/* nav-permis: întoarcerea explicită în Admin */}
          <Link href="/admin" className="rounded-lg bg-white px-3 py-1 font-semibold text-slate-900">← Înapoi în Admin</Link>
        </div>
      )}
      {children}
    </PanelShell>
  );
}
