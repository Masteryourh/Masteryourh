import { upcomingProducts } from "@/lib/products";

export function UpcomingProductGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {upcomingProducts.map((p) => (
        <li key={p.id} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-forest-900/8">
          <span className="self-start rounded-full bg-grain-300/60 px-3 py-1 text-xs font-semibold text-forest-900">În curând</span>
          <h3 className="mt-4 text-xl font-semibold">{p.name}</h3>
          <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
        </li>
      ))}
    </ul>
  );
}
