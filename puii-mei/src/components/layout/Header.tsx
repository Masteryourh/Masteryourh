import { mainNav } from "@/lib/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-forest-900/5 bg-cream-50/85 backdrop-blur-md">
      <Container className="flex h-16 max-w-7xl items-center justify-between gap-4 sm:h-20">
        <Logo />
        <nav aria-label="Navigare principală" className="hidden items-center gap-0.5 xl:flex">
          {mainNav.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/comanda" className="hidden whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-forest-800 hover:bg-forest-50 md:block xl:hidden">
            Comanda mea
          </Link>
          <Link
            href="/comanda"
            aria-label="Comanda mea"
            title="Comanda mea"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-forest-900/10 bg-white text-forest-800 hover:bg-forest-50 xl:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" />
            </svg>
          </Link>
          <Link
            href="/cont"
            aria-label="Contul meu (admin, gospodar, investitor)"
            title="Contul meu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-forest-900/10 bg-white text-forest-800 hover:bg-forest-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 21v-1a5 5 0 00-5-5H9a5 5 0 00-5 5v1M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </Link>
          <div className="hidden sm:block">
            <ButtonLink href="/precomanda" className="whitespace-nowrap">Vreau să comand</ButtonLink>
          </div>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
