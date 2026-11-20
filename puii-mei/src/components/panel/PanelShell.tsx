import Link from "next/link";
import type { User } from "@/lib/domain";
import { roleLabels } from "@/lib/roles";
import { PanelNav, type PanelNavItem } from "./PanelNav";

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
}: {
  user: User;
  title: string;
  home: string;
  items: PanelNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="panou flex min-h-dvh flex-1 flex-col bg-slate-100 text-slate-900 lg:flex-row">
      <aside className="border-b border-slate-200 bg-slate-50 print:hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:py-5">
          <Link href={home} className="block">
            <span className="block text-sm font-bold">Puii mei</span>
            <span className="block text-xs text-slate-500">{title}</span>
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
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
        {children}
      </main>
    </div>
  );
}
