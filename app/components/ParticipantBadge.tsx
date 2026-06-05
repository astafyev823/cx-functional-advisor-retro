import { colorForIdx, initials } from "@/lib/colors";

type Props = {
  name: string;
  colorIdx: number;
  size?: "sm" | "lg";
  className?: string;
};

// The little colored disc with a participant's initials.
// Used in note lists, commitment cards, pins, etc.
export function ParticipantBadge({ name, colorIdx, size = "sm", className = "" }: Props) {
  const c = colorForIdx(colorIdx);
  const dim = size === "lg" ? "w-9 h-9 text-[13px]" : "w-7 h-7 text-[11px]";
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white font-medium shrink-0 ${dim} ${className}`}
      style={{ background: c.hex }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
