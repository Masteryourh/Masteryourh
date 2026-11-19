import Link from "next/link";
import type { Farm, Lot } from "@/lib/domain";
import { availabilityDate, availableBirds, growthProgress, lotStatus } from "@/lib/lots";
import { formatDate } from "@/lib/format";
import { LotStatusBadge } from "./LotStatusBadge";

export function LotCard({ lot, farm }: { lot: Lot; farm?: Farm | null }) {
  const status = lotStatus(lot);
  const progress = growthProgress(lot);
  return (
    <Link
      href={`/trasabilitate/${lot.code}`}
      className="group flex flex-col rounded-3xl border border-forest-900/8 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-forest-900/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-forest-800">{lot.code}</p>
          {farm && <p className="mt-1 text-sm text-muted">{farm.name}, {farm.village}</p>}
        </div>
        <LotStatusBadge status={status} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Început creștere</dt>
          <dd className="font-medium">{formatDate(lot.startDate)}</dd>
        </div>
        <div>
          <dt className="text-muted">Disponibil estimat</dt>
          <dd className="font-medium">{formatDate(availabilityDate(lot))}</dd>
        </div>
        {status === "precomenzi-deschise" && (
          <div className="col-span-2">
            <dt className="text-muted">Locuri libere</dt>
            <dd className="font-medium">
              {availableBirds(lot)} din {lot.totalBirds} pui
            </dd>
          </div>
        )}
      </dl>
      {status === "in-crestere" && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted">
            <span>Progres creștere</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest-50">
            <div className="h-full rounded-full bg-forest-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 group-hover:text-forest-900">
        Vezi trasabilitatea <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
