"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/lib/site";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";

/**
 * Pe prima pagină, meniul plutește transparent peste scena din hero (text alb, pastilă
 * translucidă); după derulare și pe celelalte pagini devine bara obișnuită.
 */
export function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const light = home && !scrolled;

  return (
    <header
      className={cn(
        "top-0 z-40 w-full transition-[background-color,box-shadow,border-color] duration-300",
        home ? "fixed inset-x-0" : "sticky",
        light ? "border-b border-transparent bg-transparent" : "border-b border-forest-900/5 bg-cream-50/90 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Logo light={light} className={cn(light && "[&_span]:drop-shadow-[0_2px_10px_rgba(28,70,120,0.35)]")} />
        <nav
          aria-label="Navigare principală"
          className={cn(
            "hidden items-center gap-0.5 rounded-full p-1.5 xl:flex",
            light ? "bg-[rgba(173,196,174,0.45)] backdrop-blur-md" : "",
          )}
        >
          {mainNav.map((item) => (
            <NavLink key={item.href} href={item.href} light={light}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/comanda"
            className={cn(
              "hidden whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold md:block xl:hidden",
              light ? "text-white hover:bg-white/20" : "text-forest-800 hover:bg-forest-50",
            )}
          >
            Comanda mea
          </Link>
          <IconLink href="/comanda" label="Comanda mea" light={light} className="hidden xl:inline-flex">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" />
          </IconLink>
          <IconLink href="/cont" label="Contul meu (admin, gospodar, investitor)" light={light}>
            <path d="M20 21v-1a5 5 0 00-5-5H9a5 5 0 00-5 5v1M12 11a4 4 0 100-8 4 4 0 000 8z" />
          </IconLink>
          <Link
            href="/precomanda"
            className={cn(
              "hidden whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 sm:inline-flex",
              light ? "bg-white text-forest-500 hover:bg-cream-50" : "bg-grain-400 text-forest-900 hover:bg-grain-500",
            )}
          >
            Vreau să comand
          </Link>
          <MobileNav light={light} />
        </div>
      </div>
    </header>
  );
}

function IconLink({
  href,
  label,
  light,
  className,
  children,
}: {
  href: string;
  label: string;
  light: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
        light ? "border-white/40 bg-white/15 text-white backdrop-blur hover:bg-white/25" : "border-forest-900/10 bg-white text-forest-800 hover:bg-forest-50",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </Link>
  );
}
