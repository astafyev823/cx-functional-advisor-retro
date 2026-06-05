import type { ReactNode } from "react";

type Props = {
  emoji: string;
  title: string;
  body: ReactNode;
  footer: string;
  bgColor: string;
  textColor: string;
  className?: string;
};

// Static, read-only pause prompt rendered at the bottom of certain pages.
// No interactivity, no DB — purely visual.
export function PauseCard({
  emoji,
  title,
  body,
  footer,
  bgColor,
  textColor,
  className = "",
}: Props) {
  return (
    <div
      className={`mx-auto mt-8 text-center ${className}`}
      style={{
        background: bgColor,
        color: textColor,
        maxWidth: 720,
        borderRadius: 24,
        padding: 32,
        boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }}>
        {emoji}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          opacity: 0.85,
        }}
      >
        {body}
      </div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.6,
          fontStyle: "italic",
          marginTop: 12,
        }}
      >
        {footer}
      </div>
    </div>
  );
}
