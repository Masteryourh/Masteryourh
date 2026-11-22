import { Icon } from "@/components/ui/Icon";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Formular simplu (GET) – funcționează și fără JavaScript. */
export function LotLookup({ defaultValue, error, dark = false }: { defaultValue?: string; error?: string; dark?: boolean }) {
  return (
    <form action="/trasabilitate" method="get" role="search" className="w-full max-w-xl">
      <label htmlFor="cod-lot" className={cn("mb-2 block text-sm font-medium", dark ? "text-cream-100" : "text-forest-900")}>
        Codul lotului (de pe eticheta produsului sau din confirmarea comenzii)
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            id="cod-lot"
            name="cod"
            defaultValue={defaultValue}
            placeholder="ex. MS-2026-01"
            autoComplete="off"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "cod-lot-eroare" : undefined}
            className="w-full rounded-full border border-forest-900/15 bg-white py-3.5 pr-4 pl-12 font-mono text-base uppercase text-ink placeholder:font-sans placeholder:normal-case placeholder:text-muted/70 focus:border-forest-500 focus:outline-none"
          />
        </div>
        <button type="submit" className={buttonClasses("primary", "lg")}>
          Caută lotul
        </button>
      </div>
      {error && (
        <p id="cod-lot-eroare" role="alert" className={cn("mt-2 text-sm font-medium", dark ? "text-grain-300" : "text-red-700")}>
          {error}
        </p>
      )}
    </form>
  );
}
