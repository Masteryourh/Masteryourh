"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type PanelNavItem = { href: string; label: string; badge?: number; exact?: boolean };

/** Secțiunile panoului: listă verticală pe desktop, bară orizontală pe telefon. */
export function PanelNav({ items, label }: { items: PanelNavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map((i) => {
          const active = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
                  active ? "bg-slate-900 font-semibold text-white" : "text-slate-700 hover:bg-slate-200",
                )}
              >
                {i.label}
                {!!i.badge && (
                  <span className={cn("rounded px-1.5 text-xs font-semibold", active ? "bg-white text-slate-900" : "bg-amber-300 text-slate-900")}>
                    {i.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
