import type { Preorder } from "@/lib/domain";

export function OrderInfo({ p, zone }: { p: Preorder; zone: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono font-semibold">{p.number}</p>
        <p className="text-sm font-semibold">{p.birds} pui</p>
      </div>
      <p className="mt-1 font-semibold text-forest-900">{p.customer.name}</p>
      <a href={`tel:${p.customer.phone}`} className="text-sm font-semibold text-forest-700 underline">{p.customer.phone}</a>
      <p className="mt-1 text-sm text-muted">
        {zone}
        {p.address ? ` · ${p.address}` : ""}
      </p>
      {p.notes && <p className="mt-1 text-sm italic text-muted">„{p.notes}”</p>}
    </div>
  );
}
