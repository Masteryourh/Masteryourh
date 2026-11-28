import { Suspense } from "react";
import Link from "next/link";
import type { User } from "@/lib/domain";
import { roleLabels } from "@/lib/roles";
import { PanelNav, type PanelNavItem } from "./PanelNav";
import { PanelCrumbs } from "./PanelCrumbs";
import { GlassRail } from "./GlassRail";
import { MobileTabBar } from "./MobileTabBar";
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
      // overflow-x-clip: un tabel lat nu are voie să lărgească pagina (pe telefon ar împinge bara de jos în afara
      // ecranului); conținutul lat se derulează în propriul container. „clip” (nu „hidden”) păstrează antetul sticky.
      <div className="panou panou-rail flex min-h-dvh flex-1 flex-col overflow-x-clip bg-slate-100 text-slate-900">
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
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden text-xs text-slate-500 underline hover:text-slate-800 md:inline">Deschide website ↗</a>
            <ThemeToggle className="h-8 w-8 rounded-md border border-slate-300 bg-white hover:bg-slate-100" />
            <form action="/cont/iesire" method="post">
              <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-100">Ieșire</button>
            </form>
          </div>
        </header>
        {/* Telefon: bara de jos ca într-o aplicație; de la sm în sus: bara „sticlă” flotantă (restrânsă / extinsă). */}
        <GlassRail items={items} label={title} userName={user.name} userRole={roleLabels[user.role]} />
        <main id="continut" className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-10">
          <Suspense fallback={null}><PanelCrumbs /></Suspense>
          {children}
        </main>
        <MobileTabBar items={items} label={title} />
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
              Deschide website ↗
            </a>
          </div>
        </div>
      </aside>
      <main id="continut" className="min-w-0 flex-1 pb-10">
        <Suspense fallback={null}><PanelCrumbs /></Suspense>
        {children}
      </main>
    </div>
  );
}
