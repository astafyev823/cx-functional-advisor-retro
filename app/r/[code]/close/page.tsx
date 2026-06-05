"use client";

import { useMemo, useState } from "react";
import { Banner } from "@/app/components/Banner";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { Modal } from "@/app/components/Modal";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { useHealthSubmissions } from "@/hooks/useHealthSubmissions";
import { COLORS, colorForIdx, type ParticipantColor } from "@/lib/colors";
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

type TextEntry = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

type FinalReflection = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

type Participant = { id: string; name: string; color_idx: number };

export default function ClosePage() {
  const { session, currentParticipant, participants } = useSession();
  const sessionId = session?.id ?? null;

  const { items: commitments } = useEntries<Commitment>("commitments", sessionId);
  const { items: retroCards } = useEntries<RetroCard>("retro_cards", sessionId);
  const { items: proudMoments } = useEntries<TextEntry>("proud_moments", sessionId);
  const { items: futureWishes } = useEntries<TextEntry>("bolder_notes", sessionId);
  const { items: reflections } = useEntries<FinalReflection>(
    "final_reflections",
    sessionId,
  );
  const { submissions } = useHealthSubmissions(sessionId);

  const [modalOpen, setModalOpen] = useState(false);
  const [refDraft, setRefDraft] = useState("");
  const [submittingRef, setSubmittingRef] = useState(false);
  const [exporting, setExporting] = useState(false);

  const onExportClick = async () => {
    if (!sessionId || exporting) return;
    setExporting(true);
    try {
      // Lazy-load @react-pdf/renderer — heavy, only needed on click.
      const mod = await import("@/app/components/PdfExport");
      await mod.exportSessionPdf(sessionId);
    } catch (err) {
      console.error("[session export]", err);
      alert("Couldn't generate the export. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

  const ownCommitments = useMemo(
    () =>
      currentParticipant
        ? commitments.filter((c) => c.participant_id === currentParticipant.id)
        : [],
    [commitments, currentParticipant],
  );

  // --- tile computation ---
  const tiles = useMemo(() => {
    // 1. Average program health score — mean of the 4 dial averages,
    //    across all participants who submitted (engagement != null is
    //    the submission marker, per Page 3 synthesis logic).
    let avgHealth: number | null = null;
    const submitted = [...submissions.values()].filter(
      (s) => s.engagement != null,
    );
    if (submitted.length > 0) {
      const dialKeys = ["engagement", "energy", "prioritisation", "ways"] as const;
      const dialAverages = dialKeys.map((k) => {
        const vals = submitted.map((s) => (s[k] ?? 0) as number);
        return vals.reduce((a, b) => a + b, 0) / submitted.length;
      });
      const mean = dialAverages.reduce((a, b) => a + b, 0) / dialAverages.length;
      avgHealth = Math.round(mean);
    }

    // 2. Commitments made
    const commitmentCount = commitments.length;

    // 3. Retro cards written
    const retroCount = retroCards.length;

    // 4. Proud moments shared (Celebrate)
    const proudCount = proudMoments.length;

    // 5. Wishes for the year ahead (Future)
    const futureCount = futureWishes.length;

    // 6. Final reflections shared (Close)
    const reflectionCount = reflections.length;

    return {
      avgHealth,
      commitmentCount,
      retroCount,
      proudCount,
      futureCount,
      reflectionCount,
    };
  }, [submissions, commitments, retroCards, proudMoments, futureWishes, reflections]);

  // --- final reflection submit ---
  const submitReflection = async () => {
    const text = refDraft.trim();
    if (!text || !session || !currentParticipant || submittingRef) return;
    setSubmittingRef(true);
    const sb = getSupabase();
    const { error } = await sb.from("final_reflections").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("[final_reflections insert]", error);
    else setRefDraft("");
    setSubmittingRef(false);
  };

  const TILE_DEFS: ReadonlyArray<{
    value: number | string;
    caption: string;
    color: ParticipantColor;
  }> = [
    {
      value: tiles.avgHealth == null ? "—" : tiles.avgHealth,
      caption: "average program health score",
      color: COLORS[0],
    },
    { value: tiles.commitmentCount,  caption: "commitments made",          color: COLORS[2] },
    { value: tiles.retroCount,       caption: "retro cards written",       color: COLORS[4] },
    { value: tiles.proudCount,       caption: "proud moments shared",      color: COLORS[3] },
    { value: tiles.futureCount,      caption: "wishes for the year ahead", color: COLORS[1] },
    { value: tiles.reflectionCount,  caption: "final reflections",         color: COLORS[0] },
  ];

  return (
    <main className="page-shell">
      <ShapesBg density="full" />
      <div className="relative z-10">
        {/* Export pill — anyone in the room can grab a clean PDF
            record. Sits above the banner so it's reachable without
            scrolling. */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onExportClick}
            disabled={!sessionId || exporting}
            className="inline-flex items-center justify-center rounded-full px-[18px] py-[10px] text-[13px] font-medium border-[1.5px] border-navy text-navy bg-white shadow-sm transition-transform duration-100 hover:enabled:scale-[1.04] active:enabled:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? "Generating…" : "Export session"}
          </button>
        </div>

        {/* Section 1 — Thank-you banner */}
        <Banner
          background={COLORS[1].hex}
          className="text-center mb-6"
          style={{ padding: "48px 24px" }}
        >
          <div
            className="absolute rounded-full"
            style={{
              top: 16,
              right: 48,
              width: 56,
              height: 56,
              background: COLORS[0].hex,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: 16,
              left: 64,
              width: 40,
              height: 40,
              background: COLORS[3].hex,
            }}
          />
          <div
            className="absolute"
            style={{
              top: 48,
              left: 96,
              width: 24,
              height: 24,
              background: COLORS[4].hex,
              transform: "rotate(20deg)",
            }}
          />
          <h1 className="text-[36px] font-medium text-white relative">
            Thank you for driving the CX transformation!
          </h1>
          <p
            className="text-[15px] relative"
            style={{ opacity: 0.8, marginTop: 8 }}
          >
            {participants.length} {participants.length === 1 ? "person" : "people"} ·{" "}
            {commitments.length}{" "}
            {commitments.length === 1 ? "commitment" : "commitments"} · 1 great
            conversation
          </p>
        </Banner>

        {/* Section 2 — By the numbers */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div
                className="font-medium text-[15px]"
                style={{ color: COLORS[1].hex }}
              >
                📊 By the numbers
              </div>
              <div className="text-xs text-ink-faint">
                Real numbers from today&apos;s session.
              </div>
            </div>
            <div
              className="text-[10px] px-2.5 py-[3px] rounded-full"
              style={{ background: COLORS[4].tint, color: COLORS[4].dark }}
            >
              Auto-generated
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TILE_DEFS.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl text-left p-5"
                style={{ background: t.color.tint }}
              >
                <div
                  className="text-[28px] font-medium leading-tight"
                  style={{ color: t.color.dark }}
                >
                  {t.value}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: t.color.dark, opacity: 0.85 }}
                >
                  {t.caption}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 3 — Commitments revisited */}
        <Card className="mb-7">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div
                className="font-medium text-[15px]"
                style={{ color: COLORS[0].hex }}
              >
                🤝 Commitments revisited
              </div>
              <div className="text-xs text-ink-faint">
                Last chance to add a commitment or refine your existing one.
              </div>
            </div>
            {currentParticipant ? (
              <PillButton onClick={() => setModalOpen(true)}>
                Add or refine commitment
              </PillButton>
            ) : null}
          </div>

          {commitments.length === 0 ? (
            <div
              className="text-[13px] italic"
              style={{ color: "#888" }}
            >
              No commitments yet. Click &ldquo;Add or refine commitment&rdquo;
              to add yours.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {commitments.map((c) => (
                <CommitmentRecapCard
                  key={c.id}
                  commitment={c}
                  author={participantById(c.participant_id)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Section 4 — Final reflections */}
        <Eyebrow color={COLORS[0].hex}>FINAL REFLECTIONS</Eyebrow>
        <h3 className="text-lg font-medium text-navy mb-3">
          One thing you&apos;re taking away
        </h3>

        {currentParticipant ? (
          <div className="flex gap-2 mb-5">
            <input
              value={refDraft}
              onChange={(e) => setRefDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitReflection();
              }}
              placeholder="Your takeaway..."
              className="flex-1 px-4 py-2.5 rounded-full border border-black/10 bg-white text-sm outline-none focus:border-navy"
            />
            <PillButton
              onClick={submitReflection}
              disabled={!refDraft.trim() || submittingRef}
            >
              Share
            </PillButton>
          </div>
        ) : (
          <div className="text-xs text-ink-faint mb-5">
            Join from the welcome page to share.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {reflections.map((r) => {
            const author = participantById(r.participant_id);
            const c = colorForIdx(author?.color_idx ?? 0);
            return (
              <div
                key={r.id}
                className="flex gap-2 p-3 rounded-2xl"
                style={{ background: c.tint }}
              >
                <ParticipantBadge
                  name={author?.name ?? "?"}
                  colorIdx={author?.color_idx ?? 0}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[11px] font-medium mb-0.5"
                    style={{ color: c.dark }}
                  >
                    {author?.name ?? "Unknown"}
                  </div>
                  <div className="text-[13px]" style={{ color: c.dark }}>
                    {r.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        hideFooter
      >
        <CommitmentModalBody
          currentParticipant={currentParticipant}
          sessionId={sessionId}
          ownCommitments={ownCommitments}
          onClose={() => setModalOpen(false)}
        />
      </Modal>
    </main>
  );
}

// ============================================================
// CommitmentRecapCard — read-only display for the recap list.
// (Edit happens in the modal, not here.)
// ============================================================

function CommitmentRecapCard({
  commitment,
  author,
}: {
  commitment: Commitment;
  author: Participant | null;
}) {
  const c = colorForIdx(author?.color_idx ?? 0);
  return (
    <div className="rounded-2xl p-3 flex gap-3" style={{ background: c.tint }}>
      <ParticipantBadge
        name={author?.name ?? "?"}
        colorIdx={author?.color_idx ?? 0}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-[11px] font-medium mb-0.5"
          style={{ color: c.dark }}
        >
          {author?.name ?? "Unknown"}
        </div>
        <div
          className="text-sm font-medium whitespace-pre-wrap break-words"
          style={{ color: c.dark }}
        >
          {commitment.what}
        </div>
        <div
          className="text-[11px] mt-1"
          style={{ color: c.dark, opacity: 0.7 }}
        >
          by {commitment.by_when}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CommitmentModalBody — Scenario A (no commitments) shows the
// simple new form. Scenario B (existing) shows the existing list
// with per-card edit, plus an "Add another" form below.
// ============================================================

function CommitmentModalBody({
  currentParticipant,
  sessionId,
  ownCommitments,
  onClose,
}: {
  currentParticipant: Participant | null;
  sessionId: string | null;
  ownCommitments: Commitment[];
  onClose: () => void;
}) {
  if (!currentParticipant) {
    // Defensive: the open button is hidden in this case, but in case it
    // somehow opens, give a graceful message.
    return (
      <>
        <h2 className="text-xl font-medium text-navy mb-2">
          Add or refine your commitment
        </h2>
        <p className="text-xs text-ink-faint mb-4">
          Join from the welcome page first, then come back here.
        </p>
        <div className="flex justify-end">
          <PillButton variant="secondary" onClick={onClose}>
            Cancel
          </PillButton>
        </div>
      </>
    );
  }

  const c = colorForIdx(currentParticipant.color_idx);
  const hasExisting = ownCommitments.length > 0;

  return (
    <>
      <h2 className="text-xl font-medium text-navy mb-1.5">
        Add or refine your commitment
      </h2>
      <p className="text-xs text-ink-faint mb-5">
        You can edit your existing commitment if you&apos;ve already made one,
        or add another.
      </p>

      {hasExisting ? (
        <>
          <div className="text-[10px] font-medium tracking-[1px] text-[#888] mb-2">
            YOUR EXISTING COMMITMENTS
          </div>
          <div className="mb-5">
            {ownCommitments.map((commitment) => (
              <ExistingCommitmentEditor
                key={commitment.id}
                commitment={commitment}
                authorName={currentParticipant.name}
                authorColor={c}
              />
            ))}
          </div>

          <div className="border-t border-black/[0.08] mt-2 mb-4" />

          <div className="text-[10px] font-medium tracking-[1px] text-[#888] mb-3">
            ADD ANOTHER
          </div>
          <NewCommitmentForm
            currentParticipant={currentParticipant}
            sessionId={sessionId}
            onSubmitted={onClose}
          />
          <div className="mt-5 flex justify-end">
            <PillButton variant="secondary" onClick={onClose}>
              Cancel
            </PillButton>
          </div>
        </>
      ) : (
        <NewCommitmentForm
          currentParticipant={currentParticipant}
          sessionId={sessionId}
          onSubmitted={onClose}
          onCancel={onClose}
        />
      )}
    </>
  );
}

// ============================================================
// NewCommitmentForm — same shape as Page 3's commitment form,
// scoped down to fit the modal context.
// ============================================================

function NewCommitmentForm({
  currentParticipant,
  sessionId,
  onSubmitted,
  onCancel,
}: {
  currentParticipant: Participant;
  sessionId: string | null;
  onSubmitted: () => void;
  onCancel?: () => void; // if provided, render a Cancel button beside Commit
}) {
  const [draftWhat, setDraftWhat] = useState("");
  const [draftBy, setDraftBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const c = colorForIdx(currentParticipant.color_idx);

  const submit = async () => {
    const what = draftWhat.trim();
    if (!what || !sessionId || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("commitments").insert({
      session_id: sessionId,
      participant_id: currentParticipant.id,
      what,
      by_when: draftBy.trim() || "end of 2026",
    });
    if (error) {
      console.error("[commitments insert]", error);
      setSubmitting(false);
      return;
    }
    setDraftWhat("");
    setDraftBy("");
    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div>
      <div className="text-sm mb-3">
        I,{" "}
        <strong style={{ color: c.hex }}>{currentParticipant.name}</strong>,
        commit to...
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
        {onCancel ? (
          <PillButton variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </PillButton>
        ) : null}
        <PillButton onClick={submit} disabled={!draftWhat.trim() || submitting}>
          {submitting ? "Saving…" : "Commit"}
        </PillButton>
      </div>
    </div>
  );
}

// ============================================================
// ExistingCommitmentEditor — display mode + inline edit. Save
// UPDATEs the row in place (preserves reactions, same as Page 3).
// ============================================================

function ExistingCommitmentEditor({
  commitment,
  authorName,
  authorColor,
}: {
  commitment: Commitment;
  authorName: string;
  authorColor: ParticipantColor;
}) {
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
    const sb = getSupabase();
    const { error } = await sb
      .from("commitments")
      .update({ what, by_when: draftBy.trim() || "end of 2026" })
      .eq("id", commitment.id);
    if (error) console.error("[commitments update]", error);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div
      className="rounded-2xl p-3 mb-2"
      style={{ background: authorColor.tint }}
    >
      {editing ? (
        <>
          <div className="text-[13px] mb-2" style={{ color: authorColor.dark }}>
            I, <strong>{authorName}</strong>, commit to...
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
            <PillButton onClick={save} disabled={!draftWhat.trim() || saving}>
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px]"
              style={{ color: authorColor.dark }}
            >
              <strong>{authorName}</strong> commits to:
            </div>
            <div
              className="text-sm font-medium mt-1 mb-1 whitespace-pre-wrap break-words"
              style={{ color: authorColor.dark }}
            >
              {commitment.what}
            </div>
            <div
              className="text-[11px]"
              style={{ color: authorColor.dark, opacity: 0.7 }}
            >
              by {commitment.by_when}
            </div>
          </div>
          <button
            onClick={startEdit}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white/60 hover:bg-white border border-black/[0.06] shrink-0"
            style={{ color: authorColor.dark }}
            title="Edit your commitment"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
