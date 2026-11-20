export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-ink-900" />
      <path
        d="M9 8.5h8.2c3.15 0 5.3 1.85 5.3 4.65 0 2.18-1.2 3.7-3.15 4.28L23.4 23h-3.55l-3.7-5.15H12.2V23H9V8.5Zm3.2 2.45v4.7h4.85c1.7 0 2.7-.9 2.7-2.35s-1-2.35-2.7-2.35H12.2Z"
        fill="#2DD4BF"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  invert = false,
  className = "",
}: {
  href?: string;
  invert?: boolean;
  className?: string;
}) {
  return (
    <a href={href} className={`flex items-center gap-2.5 ${className}`}>
      <Mark className={`h-8 w-8 ${invert ? "text-white" : "text-ink-900"}`} />
      <span
        className={`font-serif text-[1.35rem] leading-none tracking-tight ${
          invert ? "text-white" : "text-ink-900"
        }`}
      >
        RivalSKU
      </span>
    </a>
  );
}
