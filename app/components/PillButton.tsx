"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  // Override colors for the variant — useful when a button sits inside a
  // dark hero band, etc. If unset the variant defaults are used.
  color?: string;
};

const base =
  "inline-flex items-center justify-center rounded-full text-[13px] font-medium " +
  "transition-transform duration-100 active:enabled:scale-[0.97] hover:enabled:scale-[1.04] " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

export function PillButton({
  variant = "primary",
  color,
  className = "",
  style,
  ...rest
}: Props) {
  const variantClasses =
    variant === "primary"
      ? "px-[18px] py-[10px] text-white"
      : variant === "secondary"
      ? "px-[18px] py-[10px] bg-transparent border-[1.5px]"
      : "px-3 py-1.5 text-ink-mute hover:bg-black/5";

  const variantStyle: CSSProperties =
    variant === "primary"
      ? { background: color ?? "var(--color-navy)" }
      : variant === "secondary"
      ? { borderColor: color ?? "var(--color-navy)", color: color ?? "var(--color-navy)" }
      : {};

  return (
    <button
      {...rest}
      className={`${base} ${variantClasses} ${className}`}
      style={{ ...variantStyle, ...style }}
    />
  );
}
