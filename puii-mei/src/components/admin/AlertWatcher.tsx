"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminAlert } from "@/server/admin-alerts";

/**
 * Verifică la fiecare 30 de secunde dacă a apărut o cerere nouă (ex. prelungire de la curier)
 * și afișează o notificare în colț, plus numărul în titlul tab-ului.
 */
export function AlertWatcher({ initial }: { initial: string[] }) {
  const seen = useRef(new Set(initial));
  const [fresh, setFresh] = useState<AdminAlert[]>([]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    let stop = false;
    async function poll() {
      try {
        const res = await fetch("/api/admin/alerte", { cache: "no-store" });
        if (!res.ok) return;
        const { alerts } = (await res.json()) as { alerts: AdminAlert[] };
        if (stop) return;
        document.title = alerts.length ? `(${alerts.length}) ${base}` : base;
        const added = alerts.filter((a) => !seen.current.has(a.id));
        added.forEach((a) => seen.current.add(a.id));
        if (added.length) setFresh((f) => [...added, ...f].slice(0, 3));
      } catch {
        /* rețeaua pică: reîncercăm la următorul ciclu */
      }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  if (!fresh.length) return null;
  return (
    <div className="fixed right-4 bottom-4 z-50 w-[min(92vw,360px)] space-y-2 print:hidden" role="status" aria-live="polite">
      {fresh.map((a) => (
        <div key={a.id} className="rounded-xl bg-slate-900 p-4 text-sm text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">🔔 {a.title}</p>
            <button onClick={() => setFresh((f) => f.filter((x) => x.id !== a.id))} aria-label="Închide" className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>
          <p className="mt-1 text-white/80">{a.text}</p>
          <Link href={a.href} onClick={() => setFresh((f) => f.filter((x) => x.id !== a.id))} className="mt-2 inline-block rounded-md bg-amber-300 px-3 py-1 font-semibold text-slate-900">
            Decide acum
          </Link>
        </div>
      ))}
    </div>
  );
}
