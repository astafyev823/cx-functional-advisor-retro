"use client";

import { useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { COLORS, colorForIdx } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

// Forward-looking "Future" page — the light fold of the old afternoon trio
// (BAU transition / org evolution / bold-to-bolder) into a single prompt.
// Backed by the existing `bolder_notes` realtime table to avoid a schema
// migration; each row is one participant's wish for the rest of the year.
type FutureWish = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at?: string;
};

const NUDGES = [
  "A clean handover to BAU",
  "Clarity on the CX org shape",
  "Moving from bold to bolder",
];

export default function FuturePage() {
  const { session, currentParticipant, participants } = useSession();
  const { items: wishes } = useEntries<FutureWish>(
    "bolder_notes",
    session?.id ?? null,
  );

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

  const submit = async () => {
    const text = draft.trim();
    if (!text || !session || !currentParticipant || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("bolder_notes").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("[future insert]", error);
    else setDraft("");
    setSubmitting(false);
  };

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        <Eyebrow color={COLORS[2].hex}>LOOKING AHEAD</Eyebrow>
        <h1 className="text-[38px] font-medium leading-[1.1] text-navy mb-0.5">
          The rest of the year
        </h1>
        <p className="text-[15px] text-ink-mute leading-relaxed max-w-[620px] mb-7">
          One clear thing you want to be true for the CX Transformation by the
          end of the year. Tap a prompt to start, or write your own.
        </p>

        <Card accent={COLORS[3].hex} className="mb-6 max-w-[760px]">
          <Eyebrow color={COLORS[3].hex}>THE QUESTION FOR THE ROOM</Eyebrow>
          <h2 className="text-2xl font-medium text-navy leading-tight mb-4">
            Where do we want the CX Transformation to be by December?
          </h2>

          {currentParticipant ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {NUDGES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraft(n)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition hover:opacity-80"
                    style={{ background: COLORS[3].tint, color: COLORS[3].dark }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  placeholder="By the end of the year, I'd like to see…"
                  className="flex-1 min-w-[220px] px-4 py-2.5 rounded-full border border-black/10 bg-white text-base outline-none focus:border-navy"
                />
                <PillButton
                  onClick={submit}
                  disabled={submitting || !draft.trim()}
                >
                  {submitting ? "Sharing…" : "Share"}
                </PillButton>
              </div>
            </>
          ) : (
            <div className="text-sm text-ink-faint">
              Join from the welcome page to share.
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[760px]">
          {wishes.length === 0 ? (
            <div className="text-sm text-ink-faint italic">
              Nothing shared yet — be the first.
            </div>
          ) : (
            wishes.map((w) => {
              const p = participantById(w.participant_id);
              const c = colorForIdx(p?.color_idx ?? 0);
              return (
                <div
                  key={w.id}
                  className="rounded-2xl p-3 flex gap-2"
                  style={{ background: c.tint }}
                >
                  <ParticipantBadge
                    name={p?.name ?? "?"}
                    colorIdx={p?.color_idx ?? 0}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[11px] font-medium mb-0.5"
                      style={{ color: c.dark }}
                    >
                      {p?.name ?? "Unknown"}
                    </div>
                    <div className="text-[13px]" style={{ color: c.dark }}>
                      {w.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
