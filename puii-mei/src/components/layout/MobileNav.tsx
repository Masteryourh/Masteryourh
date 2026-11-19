"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { mainNav } from "@/lib/site";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { NavLink } from "./NavLink";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // închide meniul la navigare
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="meniu-mobil"
        aria-label={open ? "Închide meniul" : "Deschide meniul"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-forest-900/10 bg-white text-forest-800"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open &&
        createPortal(
        <div id="meniu-mobil" className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-cream-50 lg:hidden sm:top-20">
          <nav aria-label="Navigare mobilă" className="flex flex-col gap-1 px-4 py-6">
            {mainNav.map((item) => (
              <NavLink key={item.href} href={item.href} className="px-4 py-3 text-lg">
                {item.label}
              </NavLink>
            ))}
            <Link href="/precomanda" className={buttonClasses("primary", "lg", "mt-6")}>
              Vreau să comand
            </Link>
          </nav>
        </div>,
          document.body,
        )}
    </div>
  );
}
