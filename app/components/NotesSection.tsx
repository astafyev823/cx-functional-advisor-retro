"use client";

import { useState } from "react";
import { colorForIdx } from "@/lib/colors";
import { Card } from "./Card";
import { Eyebrow } from "./Eyebrow";
import { ParticipantBadge } from "./ParticipantBadge";
import { PillButton } from "./PillButton";

export type Note = {
  id: string;
  text: string;
  participant_name: string;
  participant_color_idx: number;
};

type Props = {
  notes: Note[];
  currentParticipantColorIdx: number | null;  // null => not joined yet
  onSubmit: (text: string) => void | Promise<void>;
  placeholder: string;
  // Optional override of the eyebrow label. Defaults to the reference copy.
  label?: string;
};

// The "NOTES & DECISIONS · LIVE" card that lives at the bottom of pages
// 4, 5, 6. Same shape every time: textarea + submit + chronological list.
export function NotesSection({
  notes,
  currentParticipantColorIdx,
  onSubmit,
  placeholder,
  label = "NOTES & DECISIONS · LIVE",
}: Props) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isJoined = currentParticipantColorIdx != null;

  const submit = async () => {
    const text = draft.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-7">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Eyebrow color="var(--color-cobalt)" className="mb-1">{label}</Eyebrow>
          <div className="text-xs text-ink-faint">
            Capture decisions, points of tension, follow-ups. Submit to share with the room.
          </div>
        </div>
        <div className="text-[11px] text-ink-faint">
          {notes.length} {notes.length === 1 ? "note" : "notes"} shared
        </div>
      </div>

      {isJoined ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="w-full mb-2 px-4 py-2.5 rounded-2xl border border-black/10 bg-white text-sm outline-none focus:border-navy resize-y"
          />
          <div className="flex justify-end">
            <PillButton onClick={submit} disabled={submitting || !draft.trim()}>
              Submit note →
            </PillButton>
          </div>
        </>
      ) : (
        <div className="text-xs text-ink-faint p-3 rounded-lg bg-[#FAFAF7]">
          Join from the welcome page to submit notes.
        </div>
      )}

      {notes.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-black/5">
          {notes.map((n) => {
            const c = colorForIdx(n.participant_color_idx);
            return (
              <div
                key={n.id}
                className="flex gap-3 p-3 rounded-xl mb-2"
                style={{ background: c.tint }}
              >
                <ParticipantBadge
                  name={n.participant_name}
                  colorIdx={n.participant_color_idx}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium mb-0.5" style={{ color: c.dark }}>
                    {n.participant_name}
                  </div>
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: c.dark }}
                  >
                    {n.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
