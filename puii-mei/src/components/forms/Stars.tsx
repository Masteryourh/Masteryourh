"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function Stars({ name, label, hint, error, defaultValue }: { name: string; label: string; hint: string; error?: string; defaultValue?: string }) {
  const [value, setValue] = useState(Number(defaultValue) || 0);
  return (
    <div role="radiogroup" aria-label={`Nota pentru ${label}`} aria-describedby={error ? `${name}-error` : undefined}>
      <p className="text-sm font-semibold text-forest-900">
        {label} <span className="text-grain-600">*</span>
      </p>
      <p className="text-sm text-muted">{hint}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => setValue(n)} className="peer sr-only" aria-label={`${n} din 5`} />
            <svg viewBox="0 0 24 24" aria-hidden className={cn("h-9 w-9 transition peer-focus-visible:rounded peer-focus-visible:outline-2 peer-focus-visible:outline-grain-500", n <= value ? "fill-grain-400 text-grain-500" : "fill-transparent text-forest-900/25")} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
            </svg>
          </label>
        ))}
      </div>
      {error && <p id={`${name}-error`} className="mt-1.5 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
