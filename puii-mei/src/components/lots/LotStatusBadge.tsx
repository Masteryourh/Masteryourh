import type { LotStatus } from "@/lib/domain";
import { statusLabels } from "@/lib/lots";
import { cn } from "@/lib/cn";

const styles: Record<LotStatus, string> = {
  "precomenzi-deschise": "bg-grain-300/60 text-forest-900",
  "in-crestere": "bg-forest-100 text-forest-800",
  "in-procesare": "bg-cream-200 text-forest-900",
  disponibil: "bg-forest-700 text-white",
  livrat: "bg-ink/5 text-muted",
};

export function LotStatusBadge({ status, className }: { status: LotStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", styles[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {statusLabels[status]}
    </span>
  );
}
