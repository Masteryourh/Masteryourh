import Link from "next/link";
import type { User } from "@/lib/domain";
import { roleLabels } from "@/lib/roles";
import { PanelNav, type PanelNavItem } from "./PanelNav";
import { PanelCrumbs } from "./PanelCrumbs";
import { RailNav } from "./RailNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Cadrul panoului de control: fără meniul și footer-ul site-ului.
 * Bara laterală (desktop) / bara de secțiuni (telefon), utilizatorul și „Ieșire”.
 */
export function PanelShell({
  user,
  title,
  home,
  items,
  children,
  rail = false,
}: {
  user: User;
  title: string;
  home: string;
  items: PanelNavItem[];
  children: React.ReactNode;
  /** Meniul ca bară îngustă cu iconițe în dreapta ecranului (admin). */
  rail?: boolean;
}) {
  if (rail) {
    return (
      <div className="panou flex min-h-dvh flex-1 flex-col bg-slate-100 pr-14 text-slate-900 sm:pr-16">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 print:hidden sm:px-6 lg:px-8">
          <Link href={home} className="min-w-0">
            <span className="block text-sm font-bold">Puii mei</span>
            <span className="block truncate text-xs text-slate-500">{title}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-semibold">{user.name}</span>
              <span className="block text-[11px] text-slate-500">{roleLabels[user.role]}</span>
            </span>
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden text-xs text-slate-500 underline hover:text-slate-800 md:inline">Vezi site-ul ↗</a>
            <ThemeToggle className="h-8 w-8 rounded-md border border-slate-300 bg-white hover:bg-slate-100" />
            <form action="/cont/iesire" method="post">
              <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-100">Ieșire</button>
            </form>
          </div>
        </header>
        <aside className="fixed top-0 right-0 bottom-0 z-40 flex w-14 flex-col items-center border-l border-slate-200 bg-slate-50 py-3 print:hidden sm:w-16 [@media(max-height:760px)]:overflow-y-auto">
          <RailNav items={items} label={title} />
        </aside>
        <main id="continut" className="min-w-0 flex-1 pb-10">
          <PanelCrumbs />
          {children}
        </main>
      </div>
    );
  }
  return (
    <div className={`panou flex min-h-dvh flex-1 flex-col bg-slate-100 text-slate-900 lg:flex-row`}>
      <aside className="border-b border-slate-200 bg-slate-50 print:hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:py-5">
          <Link href={home} className="block">
            <span className="block text-sm font-bold">Puii mei</span>
            <span className="block text-xs text-slate-500">{title}</span>
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle className="h-7 w-7 rounded-md border border-slate-300 bg-white" />
            <form action="/cont/iesire" method="post">
              <button className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold">Ieșire</button>
            </form>
          </div>
        </div>
        <div className="px-2 pb-2 lg:flex-1 lg:overflow-y-auto lg:pb-4">
          <PanelNav items={items} label={title} />
        </div>
        <div className="hidden border-t border-slate-200 px-4 py-4 text-sm lg:block">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
          <div className="mt-3 flex items-center gap-3">
            <ThemeToggle className="h-8 w-8 rounded-md border border-slate-300 bg-white hover:bg-slate-100" />
            <form action="/cont/iesire" method="post">
              <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-100">Ieșire</button>
            </form>
            <a href="/" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 underline hover:text-slate-800">
              Vezi site-ul ↗
            </a>
          </div>
        </div>
      </aside>
      <main id="continut" className="min-w-0 flex-1 pb-10">
        <PanelCrumbs />
        {children}
      </main>
    </div>
  );
}
