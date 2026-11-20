import type { Preorder } from "@/lib/domain";
import { feedPaymentLabels } from "@/lib/pricing";
import { formatLei } from "@/lib/format";
import { cn } from "@/lib/cn";
import { setFeedReceivedAction } from "@/app/(panou)/cont/gospodar/plati-actions";

/** Starea avansului pentru hrană + butonul de confirmare a primirii (gospodar / admin). */
export function FeedCell({ preorder, amount, canConfirm }: { preorder: Preorder; amount: number; canConfirm: boolean }) {
  const status = preorder.feedPayment?.status ?? "de-platit";
  return (
    <div className="space-y-1.5">
      <span
        className={cn(
          "inline-block rounded px-2 py-0.5 text-xs font-semibold",
          status === "primita" ? "bg-green-100 text-green-900" : status === "declarata" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700",
        )}
      >
        {feedPaymentLabels[status]}
      </span>
      <div className="text-xs text-muted">{formatLei(preorder.feedPayment?.amount ?? amount)}</div>
      {canConfirm && preorder.status !== "anulata" && (
        <form action={setFeedReceivedAction}>
          <input type="hidden" name="id" value={preorder.id} />
          <input type="hidden" name="received" value={status === "primita" ? "0" : "1"} />
          <button className={cn("rounded px-2 py-0.5 text-xs font-semibold", status === "primita" ? "text-slate-600 underline" : "bg-forest-700 text-white")}>
            {status === "primita" ? "Anulează confirmarea" : "Confirm primirea"}
          </button>
        </form>
      )}
    </div>
  );
}
