const paths = {
  scale: "M12 3v18M5 7h14M7 7l-3 7a3 3 0 006 0L7 7zm10 0l-3 7a3 3 0 006 0l-3-7zM8 21h8",
  clipboard: "M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM8 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2M9 13l2 2 4-4",
  sprout: "M12 21v-8m0 0c0-4-3-6-7-6 0 4 3 6 7 6zm0 0c0-4 3-7 7-7 0 4-3 7-7 7z",
  chart: "M4 20h16M7 16v-4m5 4V8m5 8v-6",
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3zm-3 9l2 2 4-4",
  home: "M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1v-9z",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zm9 3l-4.35-4.35",
  check: "M5 12l5 5L20 7",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0112 3a7 7 0 017 6.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  arrow: "M5 12h14m-5-5l5 5-5 5",
  users: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.87M16 4.13a3 3 0 010 5.74",
  leaf: "M5 19c0-9 6-14 15-14 0 9-5 15-14 15H5zm0 0l7-7",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
