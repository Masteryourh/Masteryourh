import Link from "next/link";
import { site } from "@/lib/site";
import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Traseul paginii („Acasă › Gospodării › Gospodăria X”). Pe telefon se arată doar
 * „← Înapoi la <pagina părinte>”, ca să fie clar unde duce.
 */
export function Breadcrumbs({ items, home = true, className }: { items: Crumb[]; home?: boolean; className?: string }) {
  const all: Crumb[] = home ? [{ label: "Acasă", href: "/" }, ...items] : items;
  const parent = [...all].slice(0, -1).reverse().find((c) => c.href);
  const jsonLd = home && {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${site.url}${c.href}` } : {}) })),
  };
  return (
    <nav aria-label="Unde ești" className={cn("text-sm", className)}>
      {parent && (
        <Link href={parent.href!} className="inline-flex items-center gap-1 font-medium text-forest-700 hover:text-forest-900 sm:hidden">
          <span aria-hidden>←</span> Înapoi la {parent.label}
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-muted sm:flex">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-forest-800 hover:underline">{c.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-forest-900" : undefined}>{c.label}</span>
              )}
              {!last && <span aria-hidden className="text-forest-900/30">›</span>}
            </li>
          );
        })}
      </ol>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </nav>
  );
}
