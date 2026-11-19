import type { Lot } from "@/lib/domain";
import { currentStage, lotStages, stageDate } from "@/lib/lots";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function LotTimeline({ lot }: { lot: Lot }) {
  const stages = lotStages(lot);
  const current = currentStage(lot);
  const currentIdx = stages.findIndex((s) => s.key === current);

  return (
    <ol className="relative space-y-0">
      {stages.map((stage, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
        return (
          <li key={stage.key} className="relative flex gap-5 pb-8 last:pb-0">
            {i < stages.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-9 left-[17px] h-[calc(100%-2.25rem)] w-0.5",
                  i < currentIdx ? "bg-forest-500" : "bg-forest-900/10",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                state === "done" && "border-forest-500 bg-forest-500 text-white",
                state === "current" && "border-grain-500 bg-grain-300 text-forest-900 ring-4 ring-grain-300/40",
                state === "upcoming" && "border-forest-900/15 bg-white text-muted",
              )}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <div className="pt-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className={cn("font-sans text-base font-semibold", state === "upcoming" ? "text-muted" : "text-forest-900")}>
                  {stage.label}
                </h3>
                <span className="text-sm text-muted">
                  {state === "upcoming" ? "estimat " : ""}
                  {formatDate(stageDate(lot, stage))}
                </span>
                {state === "current" && (
                  <span className="rounded-full bg-grain-300/60 px-2 py-0.5 text-xs font-semibold text-forest-900">
                    Etapa curentă
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{stage.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
