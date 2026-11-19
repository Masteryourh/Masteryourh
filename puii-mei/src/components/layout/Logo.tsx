import Link from "next/link";
import { cn } from "@/lib/cn";

/** Pasăre rotisată pe platou, cu copanele în sus (în stilul curcanului de sărbătoare). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("h-11 w-11 shrink-0 sm:h-12 sm:w-12", className)}>
      <circle cx="24" cy="24" r="24" fill="#1b3424"/>
      <g transform="translate(24 27) scale(1.06) translate(-24 -27)">
      <ellipse cx="24" cy="36.6" rx="19.2" ry="4.7" fill="#e4d3ad"/>
      <ellipse cx="24" cy="36.2" rx="17" ry="3.6" fill="#fdfbf6"/>
      <ellipse cx="8.6" cy="35" rx="2.6" ry="1.3" transform="rotate(-20 8.6 35)" fill="#3f6b4d"/>
      <ellipse cx="10.6" cy="36.9" rx="2.3" ry="1.1" transform="rotate(15 10.6 36.9)" fill="#5e8f5a"/>
      <ellipse cx="39.4" cy="35" rx="2.6" ry="1.3" transform="rotate(20 39.4 35)" fill="#3f6b4d"/>
      <ellipse cx="37.4" cy="36.9" rx="2.3" ry="1.1" transform="rotate(-15 37.4 36.9)" fill="#5e8f5a"/>
      <circle cx="12.9" cy="37.6" r="1" fill="#b8323a"/>
      <circle cx="35.1" cy="37.6" r="1" fill="#b8323a"/>
      <circle cx="33.5" cy="38.3" r="0.85" fill="#b8323a"/>
      <path d="M8 29.8C8 22.4 15.2 17.8 24 17.8s16 4.6 16 12c0 4.6-3.5 6.6-8.2 6.6H16.2C11.5 36.4 8 34.4 8 29.8z" fill="#b8691f"/>
      <path d="M10.2 28.4c.8-5.4 6.6-8.8 13.8-8.8s13 3.4 13.8 8.8c-2.6 3.6-7.6 5.6-13.8 5.6s-11.2-2-13.8-5.6z" fill="#d1863a"/>
      <path d="M24 19.8c-1.1 3.6-1.2 8.4.2 13.4" stroke="#a65a1a" strokeWidth=".9" fill="none" strokeLinecap="round" opacity={0.7}/>
      <ellipse cx="18.6" cy="23.6" rx="4.3" ry="1.8" transform="rotate(-20 18.6 23.6)" fill="#f1c46a" opacity={0.85}/>
      <ellipse cx="16.4" cy="25.6" rx="1.4" ry=".7" transform="rotate(-20 16.4 25.6)" fill="#fdfbf6" opacity={0.55}/>
      <ellipse cx="30.6" cy="25.4" rx="2.6" ry="1.2" transform="rotate(18 30.6 25.4)" fill="#f1c46a" opacity={0.5}/>
      <ellipse cx="15" cy="20.2" rx="4.4" ry="6.7" transform="rotate(-28 15 20.2)" fill="#a65a1a"/>
      <ellipse cx="14" cy="19" rx="1.5" ry="3.4" transform="rotate(-28 14 19)" fill="#d1863a" opacity={0.9}/>
      <path d="M11.9 14.4 10.8 12.3" stroke="#f0e5cc" strokeWidth="2" strokeLinecap="round"/>
      <path transform="translate(10.6 11.6) rotate(-28)" d="M-2 .9V-1.5l.65-1.1.65 1.1.7-1.1.7 1.1.65-1.1.65 1.1V.9z" fill="#ffffff"/>
      <ellipse cx="33" cy="20.2" rx="4.4" ry="6.7" transform="rotate(28 33 20.2)" fill="#a65a1a"/>
      <ellipse cx="34" cy="19" rx="1.5" ry="3.4" transform="rotate(28 34 19)" fill="#d1863a" opacity={0.9}/>
      <path d="M36.1 14.4 37.2 12.3" stroke="#f0e5cc" strokeWidth="2" strokeLinecap="round"/>
      <path transform="translate(37.4 11.6) rotate(28)" d="M-2 .9V-1.5l.65-1.1.65 1.1.7-1.1.7 1.1.65-1.1.65 1.1V.9z" fill="#ffffff"/>
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
