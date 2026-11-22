"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { PanelNavItem } from "./PanelNav";

/** Iconițe pentru bara laterală din dreapta (contur, 24×24). */
const ICONS: Record<string, string> = {
  comenzi: "M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM8 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2M9 13l2 2 4-4",
  loturi: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  livrari: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  crestere: "M12 21v-8m0 0c0-4-3-6-7-6 0 4 3 6 7 6zm0 0c0-4 3-7 7-7 0 4-3 7-7 7z",
  calitate: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3z",
  documente: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6",
  investitii: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  parteneri: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6l3.5-7z",
  gospodarii: "M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1v-9z",
  preturi: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01",
  zone: "M12 21s-7-6.2-7-11.5A7 7 0 0112 3a7 7 0 017 6.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  interes: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z",
  utilizatori: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.87M16 4.13a3 3 0 010 5.74",
  legislatie: "M12 3v18M5 7h14M7 7l-3 7a3 3 0 006 0L7 7zm10 0l-3 7a3 3 0 006 0l-3-7zM8 21h8",
  vedere: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
};

/** Bara cu iconițe din dreapta ecranului; numele apare la trecerea cu mouse-ul / la focus. */
export function RailNav({ items, label }: { items: PanelNavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col items-center gap-1">
        {items.map((i) => {
          const active = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
          return (
            <li key={i.href} className="group relative">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                aria-label={i.label}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900",
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                  <path d={ICONS[i.icon ?? ""] ?? ICONS.comenzi} />
                </svg>
                {!!i.badge && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
                    {i.badge}
                  </span>
                )}
              </Link>
              <span
                role="tooltip"
                className="pointer-events-none absolute top-1/2 right-full z-50 mr-2 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {i.label}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
