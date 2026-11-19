"use client";

export function PrintButton({ label = "Tipărește" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-forest-700 px-6 py-3 font-semibold text-white">
      {label}
    </button>
  );
}
