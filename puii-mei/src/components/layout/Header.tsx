import { mainNav } from "@/lib/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-forest-900/5 bg-cream-50/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-20">
        <Logo />
        <nav aria-label="Navigare principală" className="hidden items-center gap-0.5 xl:flex">
          {mainNav.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ButtonLink href="/precomanda" className="whitespace-nowrap">Vreau să comand</ButtonLink>
          </div>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
