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
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-forest-500">{eyebrow}</p>
      )}
      <Tag className={cn(Tag === "h1" ? "text-title" : "text-[clamp(2rem,3.6vw,3.2rem)] leading-[1.05]", "font-semibold")}>
        {title}
      </Tag>
      {intro && <div className="mt-5 text-lead text-muted">{intro}</div>}
    </div>
  );
}
