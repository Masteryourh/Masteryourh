import Link from "next/link";
import { journey } from "./journey";

/** Semințe de păpădie care plutesc peste scenă (poziție, întârziere, durată). */
const seeds = [
  [6, 0, 19], [14, 6, 23], [23, 2.5, 17], [31, 9, 25], [42, 4, 21], [51, 12, 18], [58, 1.5, 24],
  [66, 7.5, 20], [73, 3.5, 26], [81, 10, 19], [88, 5.5, 22], [95, 13, 24],
] as const;

/**
 * Hero-ul „pictură vie”: scena din Bucovina (ilustrație generată cu Higgsfield),
 * animată discret în cod: norii se mișcă, iarba unduiește în vânt, semințe plutesc.
 */
export function Hero({ openLabel }: { openLabel: string }) {
  return (
    <section className="hero-scene relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-sky-300 text-white">
      {/* Filtrul de vânt pentru iarbă */}
      <svg aria-hidden className="absolute h-0 w-0">
        <filter id="vant" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="4">
            <animate attributeName="baseFrequency" dur="9s" values="0.012 0.06;0.016 0.07;0.012 0.06" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="9" />
        </filter>
      </svg>

      <div aria-hidden className="absolute inset-0 -z-10">
        {/* Planul de bază */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/poveste/hero.webp" alt="" fetchPriority="high" className="hero-img hero-base" />
        {/* Cerul, care alunecă încet */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/poveste/hero.webp" alt="" className="hero-img hero-sky" />
        {/* Iarba din prim-plan, în vânt */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/poveste/hero.webp" alt="" className="hero-img hero-grass" />
        <div className="hero-sun" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,58,87,0.38)_0%,rgba(28,58,87,0.12)_38%,rgba(0,0,0,0)_55%,rgba(20,40,22,0.35)_100%)]" />
        {seeds.map(([left, delay, dur], i) => (
          <span key={i} className="hero-seed" style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${dur}s` }} />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-28 text-center sm:pt-36">
        <p className="hero-in hero-blur rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-md [animation-delay:150ms]">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-grain-300 align-middle" aria-hidden />
          {openLabel}
        </p>
        <p className="hero-in hero-blur mt-6 font-display text-xl font-semibold tracking-[0.25em] uppercase [animation-delay:300ms] sm:text-2xl">
          Din gospodăriile Bucovinei
        </p>
        <h1 className="mt-2 font-display text-display font-bold text-white [text-shadow:0_6px_30px_rgba(28,70,120,0.35)]">
          <span className="hero-in hero-spring block [animation-delay:450ms]">Puii mei</span>
          <span className="hero-in hero-spring block text-[0.5em] leading-[1.05] font-semibold [animation-delay:610ms]">
            crescuți pentru tine
          </span>
        </h1>
        <p className="hero-in hero-rise mt-6 max-w-xl text-lead text-white/95 [animation-delay:800ms] [text-shadow:0_2px_12px_rgba(28,58,87,0.45)]">
          Comanzi azi. O gospodărie de la munte îi crește fără grabă. Îi primești proaspeți, la ușa ta.
        </p>
        <div className="hero-in hero-rise mt-8 flex flex-col items-center gap-3 [animation-delay:950ms] sm:flex-row">
          <Link
            href="/precomanda"
            className="rounded-full bg-white px-7 py-3.5 text-lg font-semibold text-forest-500 shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5"
          >
            Vreau să comand
          </Link>
          <a
            href="#poveste"
            className="group inline-flex items-center gap-3 rounded-full bg-[rgba(204,218,173,0.55)] py-3 pr-6 pl-3 text-lg font-medium text-white backdrop-blur-md transition hover:-translate-y-0.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-forest-500">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
            </span>
            Vezi drumul puiului
          </a>
        </div>
      </div>

      {/* Drumul puiului, în miniaturi */}
      <div className="hero-in hero-rise relative mt-12 w-full [animation-delay:1150ms]">
        <div className="mx-auto flex max-w-7xl items-end justify-between px-4 sm:px-6 lg:px-8">
          <p className="font-display text-2xl font-semibold tracking-wide uppercase [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">Drumul puiului</p>
          <a href="#poveste" className="group text-sm font-medium text-white/90 hover:text-white">
            toată povestea <span className="inline-block transition-transform group-hover:translate-x-1">›</span>
          </a>
        </div>
        <ol className="mx-auto mt-4 flex max-w-7xl snap-x gap-3 overflow-x-auto px-4 pb-8 [scrollbar-width:none] sm:px-6 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-8">
          {journey.map((s, i) => (
            <li key={s.id} className="w-36 shrink-0 snap-start lg:w-auto">
              <a href={`#pas-${s.id}`} className="group block overflow-hidden rounded-2xl bg-white/10 shadow-lg shadow-black/20 ring-1 ring-white/30 backdrop-blur transition duration-300 hover:-translate-y-2">
                <span className="block aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </span>
                <span className="flex items-center gap-2 px-3 py-2 text-sm font-semibold">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[0.7rem] text-forest-700">{i + 1}</span>
                  {s.short}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
