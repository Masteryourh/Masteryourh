"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/admin", label: "Precomenzi" },
  { href: "/admin/parteneri", label: "Solicitări parteneri" },
  { href: "/admin/gospodarii", label: "Gospodării" },
  { href: "/admin/interes", label: "Interes produse" },
];

export function AdminNav({ newApplications }: { newApplications: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administrare" className="flex gap-2 overflow-x-auto pb-1">
      {items.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
              active ? "bg-forest-800 text-white" : "bg-white text-forest-800 ring-1 ring-forest-900/10 hover:bg-forest-50",
            )}
          >
            {i.label}
            {i.href === "/admin/parteneri" && newApplications > 0 && (
              <span className="rounded-full bg-grain-400 px-2 py-0.5 text-xs text-forest-900">{newApplications}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
