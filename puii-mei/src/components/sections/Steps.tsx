import { steps } from "@/data/steps";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function Steps({ detailed = false }: { detailed?: boolean }) {
  return (
    <ol className={cn("grid gap-5", detailed ? "lg:grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-5")}>
      {steps.map((step, i) => (
        <li
          key={step.title}
          className={cn(
            "relative rounded-3xl border border-forest-900/8 bg-white p-6 shadow-sm shadow-forest-900/[0.03]",
            detailed && "grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-8 sm:p-8",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
              <Icon name={step.icon} />
            </span>
            <span className="font-display text-3xl font-semibold text-grain-500">{i + 1}</span>
          </div>
          <div className={cn(!detailed && "mt-5")}>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
            {detailed && <p className="mt-3 leading-relaxed text-ink/80">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
