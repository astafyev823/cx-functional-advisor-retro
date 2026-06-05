"use client";

// A reaction set as we hold it client-side: kind -> list of participant ids
// that have reacted with that kind.
export type Reactions = Record<ReactionKind, string[]>;

export const REACTION_KINDS = ["heart", "like", "q"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

const EMOJI: Record<ReactionKind, string> = {
  heart: "❤️",
  like: "👍",
  q: "❓",
};

const TITLE: Record<ReactionKind, string> = {
  heart: "100% agree",
  like: "Like",
  q: "Discuss",
};

type Props = {
  reactions: Partial<Reactions> | null | undefined;
  currentParticipantId: string | null;
  onToggle: (kind: ReactionKind) => void;
  className?: string;
};

// Pure presentational reaction strip. Parents own the data (e.g. they fetch
// from the `reactions` table grouped by entry_id) and the toggle callback
// (insert if missing, delete if present).
export function ReactionBar({ reactions, currentParticipantId, onToggle, className = "" }: Props) {
  const has = (k: ReactionKind) =>
    currentParticipantId != null &&
    Array.isArray(reactions?.[k]) &&
    reactions![k]!.some((id) => String(id) === String(currentParticipantId));
  const count = (k: ReactionKind) =>
    Array.isArray(reactions?.[k]) ? reactions![k]!.length : 0;

  return (
    <div className={`flex gap-1.5 mt-2 ${className}`}>
      {REACTION_KINDS.map((k) => {
        const c = count(k);
        const reacted = has(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            title={TITLE[k]}
            className={
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs " +
              "border transition-transform duration-100 hover:scale-[1.08] " +
              (reacted
                ? "bg-navy/10 border-navy/20"
                : "bg-white/70 border-black/5 hover:bg-white")
            }
            style={
              reacted
                ? { background: "rgba(15,27,92,0.08)", borderColor: "rgba(15,27,92,0.2)" }
                : undefined
            }
          >
            <span>{EMOJI[k]}</span>
            {c > 0 ? <span className="text-[11px] font-medium">{c}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
