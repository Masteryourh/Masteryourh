import Link from "next/link";
import { cn } from "@/lib/cn";

/** Pui rotisat, văzut din lateral, cu copanele în sus. Desen original. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 44" aria-hidden className={cn("h-10 w-[58px] shrink-0 sm:h-11 sm:w-16", className)}>
      <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M51.60 11.40 54.91 8.81" stroke="#3b230f" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="56.34" cy="9.67" r="2.35" fill="#3b230f"/>
      <circle cx="54.43" cy="7.22" r="2.35" fill="#3b230f"/>
      <path d="M51.60 11.40 54.91 8.81" stroke="#f6ead2" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="56.34" cy="9.67" r="1.5" fill="#f6ead2"/>
      <circle cx="54.43" cy="7.22" r="1.5" fill="#f6ead2"/>
      <path d="M35.5 22.5C34 16.5 39 12.2 44.5 12.6c3 .2 5.2-1 7.2-2.6l1.6 2.2c-1.8 1.6-2.8 3.8-3.8 6.6-1.8 4.8-6.4 7.6-9.8 7-2-.4-3.6-1.6-4.2-3.3z" fill="#a95d1f" stroke="#3b230f" strokeWidth="1.8"/>
      <path d="M8.2 34.2C3.4 26.2 8.2 13.6 20.2 9.6 30.6 6.2 43 9.4 47.6 17.6c3.4 6 3.2 13.6-1.4 18.2-2.6 2.6-6.4 3.4-11.4 3.4H15.4c-3.4 0-5.8-1.6-7.2-5z" fill="#c4702a" stroke="#3b230f" strokeWidth="1.8"/>
      <path d="M10.4 22.6c3-7.4 10.6-11 19.2-11 6.4 0 11.8 2.2 14.6 6-4.4-2.4-9.8-3.4-15.4-3-7.4.6-13.6 3.4-18.4 8z" fill="#dc8d3e"/>
      <ellipse cx="22" cy="13.4" rx="5" ry="1.6" transform="rotate(-12 22 13.4)" fill="#f3bb6c"/>
      <ellipse cx="12.6" cy="20.4" rx="1.9" ry="0.9" transform="rotate(-48 12.6 20.4)" fill="#f3bb6c"/>
      <ellipse cx="36.8" cy="13.2" rx="2.2" ry="0.9" transform="rotate(14 36.8 13.2)" fill="#f3bb6c"/>
      <path d="M14.6 28.4c3.8-5.4 12.2-6.4 18.2-2.2-3 5.2-10.8 7.6-17 5.6-1.6-.6-2.2-2-1.2-3.4z" fill="#a95d1f" stroke="#3b230f" strokeWidth="1.8"/>
      <path d="M19.4 28.6c3.2-1.8 7.4-2 10.6-.8" stroke="#dc8d3e" strokeWidth="1" fill="none"/>
      <path d="M12.6 35.4c4.6 1.6 11.4 1.8 17.6.8" stroke="#3b230f" strokeWidth="1.1" fill="none" opacity={0.55}/>
      <path d="M55.80 18.80 59.28 16.45" stroke="#3b230f" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="60.65" cy="17.40" r="2.35" fill="#3b230f"/>
      <circle cx="58.91" cy="14.83" r="2.35" fill="#3b230f"/>
      <path d="M55.80 18.80 59.28 16.45" stroke="#f6ead2" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="60.65" cy="17.40" r="1.5" fill="#f6ead2"/>
      <circle cx="58.91" cy="14.83" r="1.5" fill="#f6ead2"/>
      <path d="M39.6 30C38.4 23.6 44 19.6 49.4 20.2c2.8.2 5.2-1 7-2.4l1.4 2.2c-1.8 1.6-2.8 4-3.6 6.6-1.6 5-6.2 7.8-9.8 7.2-2.4-.4-4.2-1.8-4.8-3.8z" fill="#b8661f" stroke="#3b230f" strokeWidth="1.8"/>
      <ellipse cx="45.2" cy="23.6" rx="3.4" ry="1.2" transform="rotate(-24 45.2 23.6)" fill="#e09a4a"/>
      <ellipse cx="41.4" cy="16.4" rx="2.6" ry="1" transform="rotate(-30 41.4 16.4)" fill="#d1863a"/>
      </g>
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex shrink-0 items-center gap-3 whitespace-nowrap" aria-label="Puii mei – prima pagină">
      <LogoMark />
      <span className={cn("font-display text-[1.65rem] font-semibold tracking-tight sm:text-3xl xl:text-[1.7rem]", light ? "text-cream-50" : "text-forest-900")}>
        Puii <span className={light ? "text-grain-300" : "text-grain-600"}>mei</span>
      </span>
    </Link>
  );
}
