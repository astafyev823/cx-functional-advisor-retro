"use client";

import { useMemo, useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PauseCard } from "@/app/components/PauseCard";
import { PillButton } from "@/app/components/PillButton";
import { ReactionBar } from "@/app/components/ReactionBar";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { useHealthSubmissions, type HealthSubmission } from "@/hooks/useHealthSubmissions";
import { useReactions, type ReactionKind } from "@/hooks/useReactions";
import { COLORS, colorForIdx } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

type Commitment = {
  id: string;
  session_id: string;
  participant_id: string;
  what: string;
  by_when: string;
  created_at: string;
};

type RetroCard = {
  id: string;
  session_id: string;
  participant_id: string;
  lane: "cx" | "vmo";
  action: "continue" | "stop" | "change";
  text: string;
  created_at: string;
};

type DialKey = "engagement" | "energy" | "prioritisation" | "ways";
const DIAL_LABELS: Record<DialKey, string> = {
  engagement: "Engagement",
  energy: "Energy",
  prioritisation: "Prioritisation",
  ways: "Ways of working",
};

export default function CommitmentsPage() {
  const { session, currentParticipant, participants } = useSession();
  const { items: commitments } = useEntries<Commitment>("commitments", session?.id ?? null);
  const { items: retroCards } = useEntries<RetroCard>("retro_cards", session?.id ?? null);
  const { submissions } = useHealthSubmissions(session?.id ?? null);
  const { reactions, toggleReaction } = useReactions(session?.id ?? null);

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

  // --- write commitment ---
  const [draftWhat, setDraftWhat] = useState("");
  const [draftBy, setDraftBy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitCommitment = async () => {
    const what = draftWhat.trim();
    if (!what || !session || !currentParticipant || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("commitments").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      what,
      by_when: draftBy.trim() || "end of 2026",
    });
    if (error) console.error("[commitments insert]", error);
    else {
      setDraftWhat("");
      setDraftBy("");
    }
    setSubmitting(false);
  };

  const editCommitment = async (id: string, what: string, byWhen: string) => {
    const sb = getSupabase();
    const { error } = await sb
      .from("commitments")
      .update({ what, by_when: byWhen || "end of 2026" })
      .eq("id", id);
    if (error) console.error("[commitments update]", error);
  };

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        <Eyebrow color={COLORS[3].hex}>COMMITMENTS GOING FORWARD</Eyebrow>
        <h1 className="text-[38px] font-medium leading-[1.1] text-navy mb-8">
          From discussion to decision
        </h1>

        <SynthesisCard
          submissions={submissions}
          retroCards={retroCards}
          reactions={reactions}
        />

        <Eyebrow color={COLORS[0].hex}>COMMITMENT WALL</Eyebrow>
        <h2 className="text-2xl font-medium text-navy mb-2">What will you own?</h2>
        <p className="text-xs text-ink-faint mb-5">
          &ldquo;Based on our discussion so far, I [name] commit to [what you can
          own and drive] by [date you&rsquo;re aiming for].&rdquo;
        </p>

        {currentParticipant ? (
          <Card className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <ParticipantBadge
                name={currentParticipant.name}
                colorIdx={currentParticipant.color_idx}
                size="lg"
              />
              <div className="text-sm">
                I,{" "}
                <strong style={{ color: colorForIdx(currentParticipant.color_idx).hex }}>
                  {currentParticipant.name}
                </strong>
                , commit to...
              </div>
            </div>
            <textarea
              value={draftWhat}
              onChange={(e) => setDraftWhat(e.target.value)}
              rows={2}
              placeholder="What you'll own and drive..."
              className="w-full mb-3 px-4 py-2.5 rounded-2xl border border-black/10 bg-white text-sm outline-none focus:border-navy resize-y"
            />
            <div className="flex flex-wrap gap-2">
              <input
                value={draftBy}
                onChange={(e) => setDraftBy(e.target.value)}
                placeholder="By when? (e.g. end of Q3)"
                className="flex-1 min-w-[180px] px-4 py-2.5 rounded-full border border-black/10 bg-white text-sm outline-none focus:border-navy"
              />
              <PillButton
                onClick={submitCommitment}
                disabled={!draftWhat.trim() || submitting}
              >
                Commit
              </PillButton>
            </div>
          </Card>
        ) : (
          <div className="text-xs text-ink-faint mb-6">
            Join from the welcome page to add a commitment.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {commitments.map((c) => (
            <CommitmentCard
              key={c.id}
              commitment={c}
              author={participantById(c.participant_id)}
              isOwn={currentParticipant?.id === c.participant_id}
              currentParticipantId={currentParticipant?.id ?? null}
              reactions={reactions.get(c.id) ?? null}
              onReact={(k: ReactionKind) =>
                toggleReaction(
                  "commitment",
                  c.id,
                  currentParticipant?.id ?? null,
                  k,
                )
              }
              onSave={editCommitment}
            />
          ))}
        </div>

        <PauseCard
          emoji="🥘"
          title="Mid-session potluck"
          body="If we had a CXT potluck tomorrow, what dish are you bringing? Be specific — and tell us why."
          footer="Take 5 minutes. Go round."
          bgColor={COLORS[2].tint}
          textColor={COLORS[2].dark}
        />
      </div>
    </main>
  );
}

// ============================================================
// SynthesisCard — live read of Page 2 data.
// ============================================================

function SynthesisCard({
  submissions,
  retroCards,
  reactions,
}: {
  submissions: Map<string, HealthSubmission>;
  retroCards: RetroCard[];
  reactions: Map<string, Partial<Record<ReactionKind, string[]>>>;
}) {
  const synthesis = useMemo(() => {
    // --- Health ---
    const submitted: HealthSubmission[] = [];
    for (const s of submissions.values()) {
      if (s.engagement != null) submitted.push(s);
    }
    const N = submitted.length;
    let health: {
      stats: { key: DialKey; label: string; avg: number; spread: number }[];
      lowest: { key: DialKey; label: string; avg: number; spread: number };
      highest: { key: DialKey; label: string; avg: number; spread: number };
      worstSpread: { key: DialKey; label: string; avg: number; spread: number };
    } | null = null;
    if (N > 0) {
      const keys: DialKey[] = ["engagement", "energy", "prioritisation", "ways"];
      const stats = keys.map((key) => {
        const values = submitted.map((s) => s[key] as number);
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / N);
        const spread = Math.max(...values) - Math.min(...values);
        return { key, label: DIAL_LABELS[key], avg, spread };
      });
      const lowest = stats.reduce((m, s) => (s.avg < m.avg ? s : m), stats[0]);
      const highest = stats.reduce((m, s) => (s.avg > m.avg ? s : m), stats[0]);
      const worstSpread = stats.reduce(
        (m, s) => (s.spread > m.spread ? s : m),
        stats[0],
      );
      health = { stats, lowest, highest, worstSpread };
    }

    // --- Pins ---
    const pins: { pin_x: number; pin_y: number }[] = [];
    for (const s of submissions.values()) {
      if (s.pin_x != null && s.pin_y != null) {
        pins.push({ pin_x: s.pin_x, pin_y: s.pin_y });
      }
    }
    type QuadKey = "sweet" | "offFast" | "onSlow" | "offSlow";
    const quadrantLabel: Record<QuadKey, string> = {
      sweet: "sweet spot (on course, fast)",
      offFast: "off course, fast",
      onSlow: "on course, too slow",
      offSlow: "off course, too slow",
    };
    const quadCount: Record<QuadKey, number> = {
      sweet: 0,
      offFast: 0,
      onSlow: 0,
      offSlow: 0,
    };
    for (const p of pins) {
      if (p.pin_x >= 50 && p.pin_y < 50) quadCount.sweet++;
      else if (p.pin_x < 50 && p.pin_y < 50) quadCount.offFast++;
      else if (p.pin_x >= 50 && p.pin_y >= 50) quadCount.onSlow++;
      else quadCount.offSlow++;
    }

    // --- Top retro card ---
    let topCard: {
      card: RetroCard;
      heart: number;
      like: number;
      q: number;
      total: number;
    } | null = null;
    for (const card of retroCards) {
      const r = reactions.get(card.id);
      const heart = r?.heart?.length ?? 0;
      const like = r?.like?.length ?? 0;
      const q = r?.q?.length ?? 0;
      const total = heart + like + q;
      if (total === 0) continue;
      const better =
        !topCard ||
        total > topCard.total ||
        (total === topCard.total && card.created_at < topCard.card.created_at);
      if (better) topCard = { card, heart, like, q, total };
    }

    return { health, N, pins, quadCount, quadrantLabel, topCard };
  }, [submissions, retroCards, reactions]);

  const { health, N, pins, quadCount, quadrantLabel, topCard } = synthesis;

  const subBlock = "rounded-xl p-4 mb-3";
  const subEyebrow =
    "text-[11px] font-medium tracking-[1px] mb-2.5";

  return (
    <Card className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div
            className="font-medium text-[15px]"
            style={{ color: COLORS[1].hex }}
          >
            ✨ Session synthesis
          </div>
          <div className="text-xs text-ink-faint">Live from this room · just now</div>
        </div>
        <div
          className="text-[10px] px-2.5 py-[3px] rounded-full"
          style={{ background: COLORS[4].tint, color: COLORS[4].dark }}
        >
          Auto-generated
        </div>
      </div>

      {/* --- Sub-section 1: Health --- */}
      <div className={subBlock} style={{ background: "#FAFAF7" }}>
        <div className={subEyebrow} style={{ color: "#888" }}>
          PROGRAM HEALTH AT A GLANCE
        </div>
        {health == null ? (
          <div className="text-[13px]" style={{ color: "#444" }}>
            No health data yet — the synthesis will populate as the room submits
            on page 2.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
              {health.stats.map((s) => (
                <div key={s.key} className="leading-tight">
                  <div className="font-medium text-[20px] text-ink">
                    {s.avg}
                  </div>
                  <div className="text-[11px]" style={{ color: "#666" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[13px] mb-2" style={{ color: "#444" }}>
              Lowest dimension: {health.lowest.label} ({health.lowest.avg}).
              Highest: {health.highest.label} ({health.highest.avg}). N = {N}{" "}
              submitted.
            </div>
            <div
              className="text-[12px] italic"
              style={{ color: "#666" }}
            >
              {health.worstSpread.spread <= 22
                ? "Tight consensus across the room."
                : `Mixed views — the room isn't aligned on ${health.worstSpread.label}.`}
            </div>
          </>
        )}
      </div>

      {/* --- Sub-section 2: Pins --- */}
      <div className={subBlock} style={{ background: "#FAFAF7" }}>
        <div className={subEyebrow} style={{ color: "#888" }}>
          WHERE THE ROOM PLACED THE PROGRAM
        </div>
        {pins.length === 0 ? (
          <div className="text-[13px]" style={{ color: "#444" }}>
            No pins dropped yet.
          </div>
        ) : (
          <div className="text-[13px]" style={{ color: "#444" }}>
            {(["sweet", "offFast", "onSlow", "offSlow"] as const)
              .filter((k) => quadCount[k] > 0)
              .map((k, i) => {
                const n = quadCount[k];
                // First quadrant carries the word "pin"/"pins"; subsequent
                // ones drop it for readability: "5 pins in X. 1 in Y."
                if (i === 0) {
                  return `${n} ${n === 1 ? "pin" : "pins"} in ${quadrantLabel[k]}.`;
                }
                return `${n} in ${quadrantLabel[k]}.`;
              })
              .join(" ")}
          </div>
        )}
      </div>

      {/* --- Sub-section 3: Top retro --- */}
      <div
        className="rounded-xl p-4"
        style={{ background: COLORS[3].tint }}
      >
        <div
          className={subEyebrow}
          style={{ color: COLORS[3].dark }}
        >
          WHAT THE RETRO IS SAYING
        </div>
        {topCard == null ? (
          <div className="text-[13px]" style={{ color: COLORS[3].dark }}>
            No reactions on retro cards yet — the most-discussed card will
            surface here once the room weighs in.
          </div>
        ) : (
          <div className="text-[13px]" style={{ color: COLORS[3].dark }}>
            Most resonated card: &ldquo;{topCard.card.text}&rdquo;
            {(topCard.heart > 0 || topCard.like > 0 || topCard.q > 0) ? " — " : ""}
            {topCard.heart > 0 ? `${topCard.heart} ❤️` : ""}
            {topCard.heart > 0 && (topCard.like > 0 || topCard.q > 0) ? " " : ""}
            {topCard.like > 0 ? `${topCard.like} 👍` : ""}
            {topCard.like > 0 && topCard.q > 0 ? " " : ""}
            {topCard.q > 0 ? `${topCard.q} ❓` : ""}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// CommitmentCard — display + author-only edit affordance.
// ============================================================

function CommitmentCard({
  commitment,
  author,
  isOwn,
  currentParticipantId,
  reactions,
  onReact,
  onSave,
}: {
  commitment: Commitment;
  author: { id: string; name: string; color_idx: number } | null;
  isOwn: boolean;
  currentParticipantId: string | null;
  reactions: Partial<Record<ReactionKind, string[]>> | null;
  onReact: (k: ReactionKind) => void;
  onSave: (id: string, what: string, byWhen: string) => Promise<void>;
}) {
  const c = colorForIdx(author?.color_idx ?? 0);
  const [editing, setEditing] = useState(false);
  const [draftWhat, setDraftWhat] = useState(commitment.what);
  const [draftBy, setDraftBy] = useState(commitment.by_when);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraftWhat(commitment.what);
    setDraftBy(commitment.by_when);
    setEditing(true);
  };

  const save = async () => {
    const what = draftWhat.trim();
    if (!what || saving) return;
    setSaving(true);
    await onSave(commitment.id, what, draftBy.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <div
      className="rounded-2xl p-4 relative"
      style={{ background: c.tint }}
    >
      <div className="flex gap-3">
        <ParticipantBadge
          name={author?.name ?? "?"}
          colorIdx={author?.color_idx ?? 0}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <>
              <div className="text-[13px] mb-2" style={{ color: c.dark }}>
                I, <strong>{author?.name ?? "?"}</strong>, commit to...
              </div>
              <textarea
                value={draftWhat}
                onChange={(e) => setDraftWhat(e.target.value)}
                rows={2}
                className="w-full mb-2 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm outline-none focus:border-navy resize-y"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  value={draftBy}
                  onChange={(e) => setDraftBy(e.target.value)}
                  placeholder="By when?"
                  className="flex-1 min-w-[120px] px-3 py-1.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-navy"
                />
                <PillButton
                  onClick={save}
                  disabled={!draftWhat.trim() || saving}
                >
                  {saving ? "Saving…" : "Save"}
                </PillButton>
                <PillButton
                  variant="secondary"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </PillButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px]" style={{ color: c.dark }}>
                  <strong>{author?.name ?? "Unknown"}</strong> commits to:
                </div>
                {isOwn ? (
                  <button
                    onClick={startEdit}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/60 hover:bg-white border border-black/[0.06] shrink-0"
                    style={{ color: c.dark }}
                    title="Edit your commitment"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <div
                className="text-sm font-medium mt-1 mb-1 whitespace-pre-wrap break-words"
                style={{ color: c.dark }}
              >
                {commitment.what}
              </div>
              <div
                className="text-[11px] opacity-70"
                style={{ color: c.dark }}
              >
                by {commitment.by_when}
              </div>
              <ReactionBar
                reactions={reactions}
                currentParticipantId={currentParticipantId}
                onToggle={onReact}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
