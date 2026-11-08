"use client";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "sm" | "md";
};

export function QuantityInput({ value, onChange, min = 1, max = 1_000_000, label, size = "md" }: Props) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)));
  const pad = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const input = size === "sm" ? "h-9 w-14 text-sm" : "h-10 w-16";

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-line bg-card">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className={`${pad} grid place-items-center text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) && event.target.value !== "" ? clamp(next) : min);
        }}
        className={`${input} border-x border-line text-center font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-300`}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className={`${pad} grid place-items-center text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
