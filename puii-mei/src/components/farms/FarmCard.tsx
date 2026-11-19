import Link from "next/link";
import type { Farm } from "@/lib/domain";
import { Photo } from "@/components/ui/Photo";
import { Icon } from "@/components/ui/Icon";

export function FarmCard({ farm, activeLots }: { farm: Farm; activeLots?: number }) {
  return (
    <Link
      href={`/gospodarii/${farm.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-forest-900/8 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-forest-900/5"
    >
      <Photo src={farm.photos[0].src} alt={farm.photos[0].alt} className="aspect-[4/3]" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
      <div className="flex flex-1 flex-col p-6">
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Icon name="pin" className="h-4 w-4" />
          {farm.village}, jud. {farm.county}
        </p>
        <h3 className="mt-2 text-2xl font-semibold">{farm.name}</h3>
        <p className="mt-2 flex-1 leading-relaxed text-muted">{farm.shortDescription}</p>
        <div className="mt-5 flex items-center justify-between text-sm">
          {typeof activeLots === "number" && (
            <span className="rounded-full bg-forest-50 px-3 py-1 font-medium text-forest-800">
              {activeLots} {activeLots === 1 ? "lot activ" : "loturi active"}
            </span>
          )}
          <span className="font-semibold text-forest-700 group-hover:text-forest-900">
            Cunoaște gospodăria <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
