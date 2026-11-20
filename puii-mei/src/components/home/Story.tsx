"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { journey } from "./journey";

/**
 * Drumul puiului, pe scroll: imaginea etapei rămâne fixă (desktop) și se schimbă pe
 * măsură ce derulezi; pe telefon, fiecare etapă își are imaginea deasupra textului.
 */
export function Story() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
          (e.target as HTMLElement).dataset.visible = e.isIntersecting ? "true" : (e.target as HTMLElement).dataset.visible;
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="poveste" className="relative scroll-mt-16 bg-cream-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-forest-500 uppercase">Drumul puiului</p>
          <h2 className="mt-4 text-title">De la comanda ta la masa ta, în șapte pași</h2>
        </div>

        <div className="mt-12 lg:mt-4 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          {/* Imaginea fixă (desktop) */}
          <div className="sticky top-24 hidden h-[calc(100svh-8rem)] items-center lg:flex">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] shadow-2xl shadow-forest-900/20">
              {journey.map((s, i) => (
                <figure
                  key={s.id}
                  data-active={i === active}
                  className={cn("story-frame absolute inset-0", i === active ? "opacity-100" : "opacity-0")}
                  aria-hidden={i !== active}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={s.alt} loading={i < 2 ? "eager" : "lazy"} className="h-full w-full object-cover" />
                </figure>
              ))}
              <span key={active} className="story-badge absolute right-5 bottom-5 rounded-2xl bg-white/95 px-4 py-2 font-display text-xl font-semibold text-forest-800 shadow-lg">
                {journey[active].badge}
              </span>
              <div className="absolute top-5 left-5 flex gap-1.5" aria-hidden>
                {journey.map((s, i) => (
                  <span key={s.id} className={cn("h-1.5 rounded-full bg-white transition-all duration-500", i === active ? "w-8" : "w-1.5 opacity-60")} />
                ))}
              </div>
            </div>
          </div>

          {/* Etapele */}
          <ol className="relative">
            <span aria-hidden className="absolute top-4 bottom-4 left-5 hidden w-px bg-forest-900/10 lg:block" />
            {journey.map((s, i) => (
              <li
                key={s.id}
                id={`pas-${s.id}`}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-index={i}
                className="reveal scroll-mt-24 py-8 lg:flex lg:min-h-[78svh] lg:items-center lg:py-0"
              >
                <div className="w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={s.alt} loading="lazy" className="mb-6 aspect-[4/3] w-full rounded-3xl object-cover shadow-xl shadow-forest-900/15 lg:hidden" />
                  <div className="lg:pl-16">
                    <span
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-semibold transition-colors duration-500 lg:absolute lg:left-0",
                        i === active ? "bg-forest-500 text-white" : "bg-forest-50 text-forest-700",
                      )}
                    >
                      {i + 1}
                    </span>
                    <h3 className="mt-4 text-subtitle lg:mt-0">{s.title}</h3>
                    <p className="mt-3 max-w-md text-lead text-muted">{s.text}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {s.chips.map((c) => (
                        <li key={c} className="rounded-full bg-forest-50 px-3.5 py-1.5 text-sm font-semibold text-forest-700">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:mt-0 lg:justify-end">
          <Link href="/precomanda" className="rounded-full bg-grain-400 px-7 py-3.5 text-lg font-semibold text-forest-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-grain-500">
            Începe cu pasul 1
          </Link>
          <Link href="/cum-functioneaza" className="rounded-full px-5 py-3 font-semibold text-forest-700 hover:bg-forest-50">
            Toate detaliile procesului ›
          </Link>
        </div>
      </div>
    </section>
  );
}
