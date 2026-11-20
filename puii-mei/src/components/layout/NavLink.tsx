"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  children,
  className,
  onClick,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** Peste imaginea din hero: text alb. */
  light?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors xl:px-2.5",
        light
          ? active
            ? "bg-white/25 text-white"
            : "text-white/90 hover:bg-white/20 hover:text-white"
          : active
            ? "bg-forest-50 text-forest-800"
            : "text-ink/75 hover:bg-forest-50 hover:text-forest-800",
        className,
      )}
    >
      {children}
    </Link>
  );
}
