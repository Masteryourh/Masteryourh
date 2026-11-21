import { PanelShell } from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function FarmerLayout({ children }: LayoutProps<"/cont/gospodar">) {
  const user = await requireUser(["gospodar"], "/cont/gospodar");
  const items: PanelNavItem[] = [
    { href: "/cont/gospodar", label: "Gospodăria mea", exact: true },
    { href: "/cont/gospodar/documente", label: "Documente și cheltuieli" },
    { href: "/cont/gospodar/legislatie", label: "Legislație și reguli" },
  ];
  if (user.role === "admin") items.push({ href: "/admin", label: "← Panou admin" });
  return (
    <PanelShell user={user} title="Contul gospodarului" home="/cont/gospodar" items={items}>
      {children}
    </PanelShell>
  );
}
