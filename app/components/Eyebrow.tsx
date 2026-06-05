type Props = {
  color?: string;        // Any CSS color. Defaults to navy.
  children: React.ReactNode;
  className?: string;
};

// The small all-caps label that sits above headings in the reference.
// Renders as e.g. "— NOTES & DECISIONS · LIVE" in the chosen color.
export function Eyebrow({ color = "var(--color-navy)", children, className = "" }: Props) {
  return (
    <div
      className={`text-[11px] font-medium tracking-[1.5px] mb-2 ${className}`}
      style={{ color }}
    >
      — {children}
    </div>
  );
}
