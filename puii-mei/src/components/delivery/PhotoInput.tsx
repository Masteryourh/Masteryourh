"use client";

import { useState } from "react";

/** Câmp pentru o fotografie făcută cu camera telefonului, cu previzualizare. */
export function PhotoInput({ name, label, error }: { name: string; label: string; error?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const showError = error && !preview;
  return (
    <div>
      <label
        htmlFor={name}
        className={`relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center text-sm font-semibold ${showError ? "border-red-400 bg-red-50 text-red-800" : "border-forest-900/20 bg-cream-50 text-forest-800"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="mt-1.5 px-2">{label}</span>
          </>
        )}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-invalid={showError ? true : undefined}
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
      />
      {showError && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
