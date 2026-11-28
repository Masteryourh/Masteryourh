"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import type { PanelNavItem } from "./PanelNav";
import { ICONS } from "./RailNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const KEY = "panou-bara";
const EVENT = "panou-bara";
const isActive = (i: PanelNavItem, path: string) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));

/** Starea barei (extinsă / restrânsă) e o preferință a acestui browser; fără localStorage rămâne restrânsă. */
function readExpanded() {
  try {
    return localStorage.getItem(KEY) === "extinsa";
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function setExpanded(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "extinsa" : "restransa");
  } catch {
    /* fără localStorage: starea ține doar până la reîncărcare */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function Icon({ name, className = "h-5 w-5" }: { name?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name ?? ""] ?? ICONS.comenzi} />
    </svg>
  );
}

/** Grupurile din bară, în ordinea primei apariții (elementele fără grup stau împreună, fără titlu). */
export function groupItems(items: PanelNavItem[]) {
  const groups: { name?: string; items: PanelNavItem[] }[] = [];
  for (const i of items) {
    const g = groups.find((x) => x.name === i.group);
    if (g) g.items.push(i);
    else groups.push({ name: i.group, items: [i] });
  }
  return groups;
}

/** Filtrul „Caută pagini”: fără diacritice și fără majuscule (ex. „livrari” găsește „Livrări live”). */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Bara laterală „sticlă” (desktop, de la sm în sus): panou flotant cu două stări.
 * - restrânsă: doar iconițe (numele la trecere / focus), contoarele ca buline;
 * - extinsă: căutare de pagini (⌘K / Ctrl+K), grupuri cu titluri, elementul activ ca „pastilă”, contoare, tema, utilizatorul.
 * Accesibilitate: navigare cu tastatura și focus vizibil, Esc restrânge, fără blur dacă browserul nu îl suportă sau
 * utilizatorul cere transparență redusă (CSS `.glass`), fără animații la „mișcare redusă”.
 */
export function GlassRail({ items, label, userName, userRole }: { items: PanelNavItem[]; label: string; userName: string; userRole: string }) {
  const path = usePathname();
  const expanded = useSyncExternalStore(subscribe, readExpanded, () => false);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const toggleBtn = useRef<HTMLButtonElement>(null);

  // ⌘K / Ctrl+K: deschide bara și pune cursorul în căutare.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (window.matchMedia("(max-width: 639px)").matches) return;
        e.preventDefault();
        setExpanded(true);
        requestAnimationFrame(() => search.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return q ? items.filter((i) => fold(`${i.label} ${i.short ?? ""} ${i.group ?? ""}`).includes(q)) : items;
  }, [items, query]);
  const groups = groupItems(shown);

  return (
    <aside
      data-rail={expanded ? "extinsa" : "restransa"}
      className={cn(
        "glass fixed top-[4.25rem] right-3 bottom-3 z-40 hidden flex-col rounded-[28px] print:hidden sm:flex",
        "motion-safe:transition-[width] motion-safe:duration-200",
        expanded ? "w-64" : "w-16",
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape" && expanded) {
          setExpanded(false);
          setQuery("");
          toggleBtn.current?.focus();
        }
      }}
    >
      <button
        ref={toggleBtn}
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? "Restrânge bara" : "Extinde bara"}
        title={expanded ? "Restrânge bara (Esc)" : "Extinde bara (⌘K)"}
        className="glass-knob absolute top-5 -left-3.5 flex h-7 w-7 items-center justify-center rounded-full text-slate-700 focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={expanded ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
        </svg>
      </button>

      {expanded ? (
        <div className="px-3 pt-4">
          <label className="glass-field flex h-10 items-center gap-2 rounded-2xl px-3 text-sm focus-within:ring-2 focus-within:ring-lime-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="sr-only">Caută pagini</span>
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shown[0]) (e.currentTarget.closest("aside")?.querySelector("nav a") as HTMLAnchorElement | null)?.click();
              }}
              placeholder="Caută pagini"
              className="min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
            <kbd className="rounded-md border border-slate-300/80 px-1.5 text-[10px] font-medium text-slate-500">⌘K</kbd>
          </label>
        </div>
      ) : (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              requestAnimationFrame(() => search.current?.focus());
            }}
            aria-label="Caută pagini"
            title="Caută pagini (⌘K)"
            className="glass-field flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>
      )}

      <nav aria-label={label} className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
        {groups.length === 0 && <p className="px-3 py-2 text-sm text-slate-600">Nicio pagină găsită.</p>}
        {groups.map((g, gi) => (
          <div key={g.name ?? `g${gi}`} className={gi > 0 ? "mt-2" : undefined}>
            {g.name &&
              (expanded ? (
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase">{g.name}</p>
              ) : (
                gi > 0 && <span aria-hidden className="mx-auto my-2 block h-px w-6 bg-slate-400/50" />
              ))}
            <ul className={cn("flex flex-col gap-0.5", !expanded && "items-center")}>
              {g.items.map((i) => {
                const active = isActive(i, path);
                return (
                  <li key={i.href} className="group relative">
                    <Link
                      href={i.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={expanded ? undefined : i.label}
                      className={cn(
                        "relative flex items-center rounded-2xl text-sm transition-colors focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none",
                        expanded ? "h-10 gap-3 px-3" : "h-10 w-10 justify-center",
                        active ? "glass-pill font-semibold text-slate-900" : "text-slate-700 hover:bg-white/50 hover:text-slate-900",
                      )}
                    >
                      <Icon name={i.icon} />
                      {expanded && <span className="min-w-0 flex-1 truncate">{i.label}</span>}
                      {!!i.badge &&
                        (expanded ? (
                          <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[11px] font-bold text-slate-900">{i.badge}</span>
                        ) : (
                          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime-400 px-1 text-[10px] font-bold text-slate-900 ring-2 ring-white/80">
                            {i.badge}
                          </span>
                        ))}
                    </Link>
                    {!expanded && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute top-1/2 right-full z-50 mr-3 -translate-y-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg group-focus-within:opacity-100 group-hover:opacity-100 motion-safe:transition-opacity"
                      >
                        {i.label}
                        {!!i.badge && <span className="ml-1.5 rounded bg-white/20 px-1">{i.badge}</span>}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-slate-400/25 p-2", expanded ? "space-y-1" : "flex flex-col items-center gap-2")}>
        <ThemeToggle
          label={expanded}
          className={cn(
            "rounded-2xl text-sm text-slate-700 hover:bg-white/50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none",
            expanded ? "h-10 w-full justify-start px-3" : "h-10 w-10",
          )}
        />
        <div className={cn("flex items-center gap-3 rounded-2xl", expanded && "px-2 py-1.5")} title={expanded ? undefined : `${userName} · ${userRole}`}>
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {userName.trim().charAt(0).toUpperCase() || "?"}
          </span>
          {expanded ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{userName}</span>
              <span className="block truncate text-xs text-slate-600">{userRole}</span>
            </span>
          ) : (
            <span className="sr-only">
              {userName}, {userRole}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
