import type { Investment } from "@/lib/domain";
import { repaymentSummary } from "@/lib/documents";
import { formatDate, formatLei } from "@/lib/format";

/** Rambursarea investiției de către gospodar: progres + ratele plătite (pe loturi vândute). */
export function RepaymentBox({ investment, children }: { investment: Investment; children?: React.ReactNode }) {
  const r = repaymentSummary(investment);
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Rambursat de gospodar</p>
          <p className="text-2xl font-semibold">{formatLei(r.repaid)} <span className="text-sm font-normal text-slate-500">din {formatLei(investment.amount)}</span></p>
        </div>
        <p className="text-sm text-slate-600">
          Rămas: <strong>{formatLei(r.left)}</strong> · {r.perBird ? `${formatLei(r.perBird)} / pui livrat` : "rata pe pui: de stabilit"}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-600" style={{ width: `${r.pct}%` }} /></div>
      <p className="mt-1 text-xs text-slate-500">{r.pct}% · rate la fiecare lot vândut</p>
      {children}
      {r.payments.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {r.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{formatDate(p.date)}{p.lotCode ? ` · lotul ${p.lotCode}` : ""}{p.birds ? ` · ${p.birds} pui` : ""}{p.note ? ` · ${p.note}` : ""}</span>
              <span className="font-semibold">{formatLei(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Nicio rată încă. Prima vine după primul lot vândut.</p>
      )}
    </div>
  );
}
