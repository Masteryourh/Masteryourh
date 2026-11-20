import type { Investment } from "@/lib/domain";
import { formatDate } from "@/lib/format";

/** Cronologia unei investiții, cele mai noi evenimente sus. */
export function InvestmentTimeline({ investment }: { investment: Investment }) {
  const events = [...investment.events].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full bg-forest-500 ring-4 ring-white" aria-hidden />
          <p className="text-xs text-slate-500">{formatDate(e.date)}</p>
          <p className="font-semibold">{e.title}</p>
          {e.text && <p className="text-sm text-slate-600">{e.text}</p>}
        </li>
      ))}
    </ol>
  );
}
