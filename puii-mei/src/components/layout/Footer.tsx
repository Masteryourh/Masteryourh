import Link from "next/link";
import { mainNav, site } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-auto bg-forest-900 text-cream-100">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream-100/70">{site.tagline}</p>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-grain-300">Explorează</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/precomanda" className="text-cream-100/80 hover:text-white">
                Precomandă
              </Link>
            </li>
            <li>
              <Link href="/devino-partener" className="text-cream-100/80 hover:text-white">
                Devino gospodărie parteneră
              </Link>
            </li>
            {mainNav.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-cream-100/80 hover:text-white">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-grain-300">Contact</h2>
          <ul className="mt-4 space-y-2 text-sm text-cream-100/80">
            <li>
              <a href={`tel:${site.company.phone.replace(/\s/g, "")}`} className="hover:text-white">
                {site.company.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.company.email}`} className="hover:text-white">
                {site.company.email}
              </a>
            </li>
            <li>{site.company.schedule}</li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-grain-300">Companie</h2>
          <ul className="mt-4 space-y-2 text-sm text-cream-100/80">
            <li>{site.company.legalName}</li>
            <li>
              <Link href="/confidentialitate" className="hover:text-white">
                Politica de confidențialitate
              </Link>
            </li>
            <li>
              <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                ANPC
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-cream-100/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Puii mei. Toate drepturile rezervate.</p>
          <p>Pui crescuți la comandă în gospodării locale partenere.</p>
        </Container>
      </div>
    </footer>
  );
}
