import { cn } from "@/lib/cn";

export const inputClasses =
  "w-full rounded-2xl border border-forest-900/15 bg-white px-4 py-3 text-base text-ink placeholder:text-muted/60 transition focus:border-forest-500 focus:ring-4 focus:ring-forest-500/10 focus:outline-none aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/10";

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-forest-900">
        {label}
        {required ? <span className="text-grain-600"> *</span> : <span className="font-normal text-muted"> (opțional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldA11y(id: string, error?: string, hint?: boolean) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="website">Nu completa acest câmp</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function Checkbox({
  id,
  children,
  error,
  defaultChecked,
}: {
  id: string;
  children: React.ReactNode;
  error?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink/85">
        <input
          type="checkbox"
          {...fieldA11y(id, error)}
          defaultChecked={defaultChecked}
          className={cn("mt-0.5 h-5 w-5 shrink-0 rounded border-forest-900/30 accent-forest-700")}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 pl-8 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
