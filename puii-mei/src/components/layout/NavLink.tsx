"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
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
        active ? "bg-forest-50 text-forest-800" : "text-ink/75 hover:bg-forest-50 hover:text-forest-800",
        className,
      )}
    >
      {children}
    </Link>
  );
}
