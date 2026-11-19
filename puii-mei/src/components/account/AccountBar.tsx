import type { User } from "@/lib/domain";
import { roleLabels } from "@/lib/roles";

/** Rând cu utilizatorul autentificat și butonul „Ieșire”, afișat în zonele cu cont. */
export function AccountBar({ user, title }: { user: User; title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">{title}</p>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted">
          <span className="font-semibold text-forest-900">{user.name}</span> · {roleLabels[user.role]}
        </span>
        <form action="/cont/iesire" method="post">
          <button className="rounded-full px-3 py-1.5 font-semibold text-forest-800 ring-1 ring-forest-900/15 hover:bg-white">
            Ieșire
          </button>
        </form>
      </div>
    </div>
  );
}
