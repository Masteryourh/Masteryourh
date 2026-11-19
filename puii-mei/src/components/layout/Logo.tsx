import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("h-9 w-9", className)}>
      <circle cx="20" cy="20" r="20" fill="#1b3424" />
      <path
        d="M13 25.5c0-5.2 3.4-9.3 8-9.3 1.2-2.4 3.4-3.7 5.6-3.2-1 .7-1.5 1.6-1.6 2.7 2.2 1.4 3.6 3.9 3.6 6.9 0 4.6-3.6 7.7-8 7.7h-1.8c-3.4 0-5.8-1.7-5.8-4.8Z"
        fill="#e8bd55"
      />
      <circle cx="24.6" cy="19.6" r="1.1" fill="#1b3424" />
      <path d="M28.6 19.4l2.6.9-2.6.9z" fill="#d9a226" />
      <path d="M10 31.5h20" stroke="#8fb39a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Puii mei – prima pagină">
      <LogoMark />
      <span className={cn("font-display text-2xl font-semibold tracking-tight", light ? "text-cream-50" : "text-forest-900")}>
        Puii <span className={light ? "text-grain-300" : "text-grain-600"}>mei</span>
      </span>
    </Link>
  );
}
