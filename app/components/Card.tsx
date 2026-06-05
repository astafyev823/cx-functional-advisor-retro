import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  // Coloured left rail used on the BAU / Org / Bolder "question for the room"
  // cards. Pass any CSS color (hex or var()).
  accent?: string;
};

export function Card({ children, className = "", style, accent }: Props) {
  const baseStyle: CSSProperties = {
    ...(accent
      ? {
          borderLeft: `4px solid ${accent}`,
          borderRadius: "0 16px 16px 0",
        }
      : null),
    ...style,
  };
  return (
    <div
      className={`bg-white rounded-2xl border-[0.5px] border-black/10 px-6 py-5 ${className}`}
      style={baseStyle}
    >
      {children}
    </div>
  );
}
