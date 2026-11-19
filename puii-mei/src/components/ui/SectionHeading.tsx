import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-grain-600">{eyebrow}</p>
      )}
      <Tag className={cn(Tag === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl", "font-semibold")}>
        {title}
      </Tag>
      {intro && <div className="mt-4 text-lg leading-relaxed text-muted">{intro}</div>}
    </div>
  );
}
