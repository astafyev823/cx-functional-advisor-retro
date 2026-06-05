import type { CSSProperties, ReactNode } from "react";

type Props = {
  background?: string;            // hex / CSS color. Defaults to navy.
  textColor?: string;             // hex / CSS color. Defaults to white.
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

// The big rounded hero band used on Celebrate (7 months in!) and Close
// (Thank you for driving the CX transformation!). Self-clipped so decorative
// shapes positioned inside don't bleed out.
export function Banner({
  background = "var(--color-navy)",
  textColor = "white",
  className = "",
  style,
  children,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl px-6 py-12 ${className}`}
      style={{ background, color: textColor, ...style }}
    >
      {children}
    </div>
  );
}
