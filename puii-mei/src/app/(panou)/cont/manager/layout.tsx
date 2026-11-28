import { PanelShell } from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }: LayoutProps<"/cont/manager">) {
  const user = await requireUser(["manager-local", "manager-zonal"], "/cont/manager");
  const items: PanelNavItem[] = [
    { href: "/cont/manager", label: "Astăzi în teritoriu", short: "Azi", icon: "azi", exact: true, tab: true },
    { href: "/cont/manager/comenzi", label: "Comenzi în teritoriu", short: "Comenzi", icon: "comenzi", tab: true },
  ];
  // nav-permis: întoarcerea explicită în Admin (doar pentru administrator).
  if (user.role === "admin") items.push({ href: "/admin", label: "← Panou admin", short: "Admin", icon: "inapoi" });
  const title = user.role === "manager-local" ? "Manager local" : user.role === "manager-zonal" ? "Manager zonal" : "Vedere manager";
  return (
    <PanelShell user={user} title={title} home="/cont/manager" items={items} rail>
      {children}
    </PanelShell>
  );
}
