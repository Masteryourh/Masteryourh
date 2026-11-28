"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { PanelNavItem } from "./PanelNav";
import { ICONS } from "./RailNav";

const isActive = (i: PanelNavItem, path: string) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));

function Icon({ name }: { name?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
      <path d={ICONS[name ?? ""] ?? ICONS.comenzi} />
    </svg>
  );
}

/**
 * Navigarea pe telefon, ca într-o aplicație: bara de jos cu secțiunile principale (`tab: true`) + „Meniu” (toate
 * secțiunile, într-un panou care urcă de jos). Pe ecrane mai mari se folosește bara laterală (RailNav).
 */
export function MobileTabBar({ items, label }: { items: PanelNavItem[]; label: string }) {
  const path = usePathname();
  // Panoul „Meniu” e deschis doar pentru pagina pe care s-a deschis: la navigare se închide singur.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  // Până la 5 secțiuni încap toate jos (fără „Meniu”); altfel: cele marcate `tab` + „Meniu” pentru restul.
  const all = items.length <= 5;
  const tabs = all ? items : items.filter((i) => i.tab).slice(0, 4);
  const moreBadge = items.filter((i) => !tabs.includes(i)).reduce((s, i) => s + (i.badge ?? 0), 0);
  if (items.length < 2) return null;
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Toate secțiunile">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Închide meniul" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-white px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] shadow-2xl">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" aria-hidden />
            <ul className="grid grid-cols-1">
              {items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} aria-current={isActive(i, path) ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px]", isActive(i, path) ? "bg-slate-900 text-white" : "hover:bg-slate-100")}>
                    <Icon name={i.icon} />
                    <span className="flex-1">{i.label}</span>
                    {!!i.badge && <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-bold text-slate-900">{i.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + (all ? 0 : 1)}, minmax(0, 1fr))` }}>
          {tabs.map((i) => (
            <li key={i.href}>
              <Link href={i.href} aria-current={isActive(i, path) ? "page" : undefined} className={cn("relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", isActive(i, path) ? "text-slate-900" : "text-slate-500")}>
                {isActive(i, path) && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-lime-500" />}
                <Icon name={i.icon} />
                <span className="max-w-full truncate px-1">{i.short ?? i.label}</span>
                {!!i.badge && <span className="absolute top-2 right-[calc(50%-1.25rem)] min-w-4 rounded-full bg-lime-300 px-1 text-center text-[10px] font-bold text-slate-900">{i.badge}</span>}
              </Link>
            </li>
          ))}
          {!all && <li>
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cn("relative flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium", open ? "text-slate-900" : "text-slate-500")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-6 w-6" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              <span>Meniu</span>
              {moreBadge > 0 && <span className="absolute top-2 right-[calc(50%-1.25rem)] min-w-4 rounded-full bg-lime-300 px-1 text-center text-[10px] font-bold text-slate-900">{moreBadge}</span>}
            </button>
          </li>}
        </ul>
      </nav>
    </>
  );
}
