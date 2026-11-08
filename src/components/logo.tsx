export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-[11px] bg-brand-600 text-white shadow-[0_2px_8px_-2px_rgba(12,99,88,0.6)]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V7.5L12 13l8-5.5V19" />
          <path d="M4 7.5 12 2l8 5.5" opacity="0.55" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.98rem] font-bold tracking-tight text-ink">Maruthi</span>
        <span className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted">
          Enterprises
        </span>
      </span>
    </span>
  );
}
