"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fold, groupItems } from "./GlassRail";
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
 * secțiunile, într-un panou care urcă de jos). Pe ecrane mai mari se folosește bara „sticlă” (GlassRail).
 */
export function MobileTabBar({ items, label }: { items: PanelNavItem[]; label: string }) {
  const path = usePathname();
  // Panoul „Meniu” e deschis doar pentru pagina pe care s-a deschis: la navigare se închide singur.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => {
    setOpenAt(null);
    menuBtn.current?.focus();
  }, []);
  // Până la 5 secțiuni încap toate jos (fără „Meniu”); altfel: cele marcate `tab` + „Meniu” pentru restul.
  const all = items.length <= 5;
  const tabs = all ? items : items.filter((i) => i.tab).slice(0, 4);
  const moreBadge = items.filter((i) => !tabs.includes(i)).reduce((s, i) => s + (i.badge ?? 0), 0);
  if (items.length < 2) return null;
  return (
    <>
      {open && <MenuSheet items={items} path={path} onClose={closeMenu} />}
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
            <button ref={menuBtn} type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cn("relative flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium", open ? "text-slate-900" : "text-slate-500")}>
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

/** Foaia „Meniu” (telefon): sticlă, căutare de pagini, secțiunile pe grupuri; Esc / fundalul o închid. */
function MenuSheet({ items, path, onClose }: { items: PanelNavItem[]; path: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Focusul intră în foaie (fără să deschidă tastatura pe telefon), Esc o închide și îl întoarce la „Meniu”.
    sheet.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const q = fold(query.trim());
  const groups = groupItems(q ? items.filter((i) => fold(`${i.label} ${i.short ?? ""} ${i.group ?? ""}`).includes(q)) : items);
  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Toate secțiunile">
      <button className="absolute inset-0 bg-slate-900/40" aria-label="Închide meniul" tabIndex={-1} onClick={onClose} />
      <div ref={sheet} tabIndex={-1} className="glass absolute focus:outline-none inset-x-2 bottom-2 max-h-[80dvh] overflow-y-auto rounded-[28px] px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-400/60" aria-hidden />
        <label className="glass-field mb-2 flex h-11 items-center gap-2 rounded-2xl px-3 text-[15px] focus-within:ring-2 focus-within:ring-lime-500">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">Caută pagini</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută pagini" className="min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-500 focus:outline-none" />
        </label>
        {groups.length === 0 && <p className="px-3 py-3 text-sm text-slate-600">Nicio pagină găsită.</p>}
        {groups.map((g, gi) => (
          <div key={g.name ?? `g${gi}`}>
            {g.name && <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">{g.name}</p>}
            <ul className="grid grid-cols-1 gap-0.5">
              {g.items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={isActive(i, path) ? "page" : undefined}
                    className={cn("flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[15px] focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none", isActive(i, path) ? "glass-pill font-semibold text-slate-900" : "text-slate-800 hover:bg-white/60")}
                  >
                    <Icon name={i.icon} />
                    <span className="flex-1">{i.label}</span>
                    {!!i.badge && <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-bold text-slate-900">{i.badge}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
