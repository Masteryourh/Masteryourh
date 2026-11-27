import { PanelShell } from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({ children }: LayoutProps<"/cont/investitor">) {
  const user = await requireUser(["investitor"], "/cont/investitor");
  const items: PanelNavItem[] = [{ href: "/cont/investitor", label: "Investițiile mele", short: "Investiții", icon: "investitii", tab: true }];
  // nav-permis: întoarcerea explicită în Admin (doar pentru administrator).
  if (user.role === "admin") items.push({ href: "/admin", label: "← Panou admin", short: "Admin", icon: "inapoi" });
  return (
    <PanelShell user={user} title="Contul investitorului" home="/cont/investitor" items={items} rail>
      {children}
    </PanelShell>
  );
}
