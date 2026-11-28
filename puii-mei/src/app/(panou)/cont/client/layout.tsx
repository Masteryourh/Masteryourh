import { PanelShell } from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: LayoutProps<"/cont/client">) {
  const user = await requireUser(["client"], "/cont/client");
  const items: PanelNavItem[] = [{ href: "/cont/client", label: "Comenzile mele", short: "Comenzi", icon: "comenzi", exact: true, tab: true }];
  // nav-permis: întoarcerea explicită în Admin (doar pentru administrator).
  if (user.role === "admin") items.push({ href: "/admin", label: "← Panou admin", short: "Admin", icon: "inapoi" });
  return (
    <PanelShell user={user} title="Contul clientului" home="/cont/client" items={items} rail>
      {children}
    </PanelShell>
  );
}
