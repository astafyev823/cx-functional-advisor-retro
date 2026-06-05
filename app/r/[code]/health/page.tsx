"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { PillButton } from "@/app/components/PillButton";
import { ReactionBar } from "@/app/components/ReactionBar";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { useHealthSubmissions, type HealthSubmission } from "@/hooks/useHealthSubmissions";
import { useReactions, type ReactionKind } from "@/hooks/useReactions";
import { COLORS, colorForIdx, type ParticipantColor } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";

type DialKey = "engagement" | "energy" | "prioritisation" | "ways";
type Dials = Record<DialKey, number>;
const DEFAULT_DIALS: Dials = { engagement: 50, energy: 50, prioritisation: 50, ways: 50 };

const DIMENSIONS: ReadonlyArray<{
  key: DialKey;
  label: string;
  help: string;
  left: string;
  right: string;
}> = [
  { key: "engagement",     label: "Engagement",      help: "Are people leaning in?",       left: "Checked out", right: "All in"        },
  { key: "energy",         label: "Energy",          help: "Momentum and morale",          left: "Drained",     right: "Buzzing"       },
  { key: "prioritisation", label: "Prioritisation",  help: "Working on the right things?", left: "Scattered",   right: "Laser-focused" },
  { key: "ways",           label: "Ways of working", help: "Rituals, decisions, flow",     left: "Friction",    right: "Smooth"        },
];

type RetroAction = "continue" | "stop" | "change";
type RetroLane = "cx" | "vmo";

const LANES: ReadonlyArray<{ key: RetroLane; label: string; colorIdx: 0 | 1 | 2 | 3 | 4 }> = [
  { key: "cx",  label: "CX transformation", colorIdx: 4 },
  { key: "vmo", label: "VMO",               colorIdx: 2 },
];

const ACTIONS: ReadonlyArray<{
  key: RetroAction;
  label: string;
  sub: string;
  color: string;
  bg: string;
}> = [
  { key: "continue", label: "CONTINUE",       sub: "What we protect",       color: "#3B6D11", bg: "#EAF3DE" },
  { key: "stop",     label: "STOP",           sub: "Noise & wasted energy", color: "#A32D2D", bg: "#FCEBEB" },
  { key: "change",   label: "START / CHANGE", sub: "Do differently now",    color: "#185FA5", bg: "#E6F1FB" },
];

type RetroCard = {
  id: string;
  session_id: string;
  participant_id: string;
  lane: RetroLane;
  action: RetroAction;
  text: string;
  created_at: string;
};

export default function HealthPage() {
  const { session, currentParticipant, participants } = useSession();
  const { submissions, loaded: subsLoaded } = useHealthSubmissions(session?.id ?? null);
  const { items: retroCards } = useEntries<RetroCard>("retro_cards", session?.id ?? null);
  const { reactions, toggleReaction } = useReactions(session?.id ?? null);

  const mySubmission = currentParticipant ? submissions.get(currentParticipant.id) : undefined;
  const hasSubmittedDials = !!(mySubmission && mySubmission.engagement != null);

  // Component-local draft. Reference does the same — drafts are device-
  // local until the participant explicitly submits.
  const [draft, setDraft] = useState<Dials>(DEFAULT_DIALS);
  const initRef = useRef(false);

  // Initialize draft from the user's submitted row exactly once (covers
  // refresh-after-submit). After that, the draft is owned by the
  // component so Edit can preserve the user's last answer.
  useEffect(() => {
    if (initRef.current || !currentParticipant || !subsLoaded) return;
    const my = submissions.get(currentParticipant.id);
    if (my && my.engagement != null) {
      setDraft({
        engagement: my.engagement,
        energy: my.energy ?? 50,
        prioritisation: my.prioritisation ?? 50,
        ways: my.ways ?? 50,
      });
    }
    initRef.current = true;
  }, [currentParticipant, submissions, subsLoaded]);

  // Submitted rows are those with dials filled (engagement != null).
  // A row can exist with only pin_x/pin_y set — that's a pin-only row,
  // not a submission.
  const submittedRows = useMemo(() => {
    const out: HealthSubmission[] = [];
    for (const row of submissions.values()) {
      if (row.engagement != null) out.push(row);
    }
    return out;
  }, [submissions]);

  const teamAvg = (key: DialKey): number | null => {
    if (submittedRows.length === 0) return null;
    const sum = submittedRows.reduce(
      (s, r) => s + (r[key] as number | null ?? 0),
      0,
    );
    return Math.round(sum / submittedRows.length);
  };

  const myColor: ParticipantColor | null = currentParticipant
    ? colorForIdx(currentParticipant.color_idx)
    : null;

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

  // --- writes to health_submissions ---

  const writeRow = async (patch: Partial<HealthSubmission>) => {
    if (!session || !currentParticipant) return;
    const sb = getSupabase();
    const existing = submissions.get(currentParticipant.id);
    // Upsert with the FULL row so unspecified columns aren't blanked
    // on UPDATE. The same user is the only writer for this row, so
    // reading from local state for the "other" fields is safe.
    const fullRow = {
      session_id: session.id,
      participant_id: currentParticipant.id,
      engagement: existing?.engagement ?? null,
      energy: existing?.energy ?? null,
      prioritisation: existing?.prioritisation ?? null,
      ways: existing?.ways ?? null,
      pin_x: existing?.pin_x ?? null,
      pin_y: existing?.pin_y ?? null,
      submitted_at: existing?.submitted_at ?? null,
      ...patch,
    };
    const { error } = await sb
      .from("health_submissions")
      .upsert(fullRow, { onConflict: "session_id,participant_id" });
    if (error) console.error("[health_submissions upsert]", error);
  };

  const submitDials = () =>
    writeRow({
      engagement: draft.engagement,
      energy: draft.energy,
      prioritisation: draft.prioritisation,
      ways: draft.ways,
      submitted_at: new Date().toISOString(),
    });

  const unsubmitDials = () =>
    writeRow({
      engagement: null,
      energy: null,
      prioritisation: null,
      ways: null,
      submitted_at: null,
    });

  const dropPin = (xPct: number, yPct: number) =>
    writeRow({ pin_x: xPct, pin_y: yPct });

  // --- writes to retro_cards ---

  const addRetroCard = async (lane: RetroLane, action: RetroAction, text: string) => {
    if (!session || !currentParticipant) return;
    const sb = getSupabase();
    const { error } = await sb.from("retro_cards").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      lane,
      action,
      text,
    });
    if (error) console.error("[retro_cards insert]", error);
  };

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        {/* =========================== HEALTH CHECK CARD =========================== */}
        <Card className="mb-10 max-w-[760px]">
          <div className="flex justify-between items-center pb-3.5 border-b-[0.5px] border-black/[0.08] mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-[18px] h-[18px] rounded-[4px] border-[1.5px] border-black/35" />
              <div>
                <div className="font-medium text-[15px] text-ink">Program health check</div>
                <div className="text-[11px] text-ink-faint">60-second pulse</div>
              </div>
            </div>
            <div className="text-[11px] px-3.5 py-1.5 rounded-full border-[0.5px] border-black/15 text-ink-mute text-center leading-[1.3]">
              Step 1 of<br />2
            </div>
          </div>

          <div className="font-medium text-sm text-ink mb-0.5">
            How healthy does the program feel right now?
          </div>
          <div className="text-xs text-ink-faint mb-4">
            Drag each dial. Gut answers only.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {DIMENSIONS.map((dim) => {
              const avg = teamAvg(dim.key);
              const dotCount = submittedRows.length;
              const totalParticipants = participants.length;
              const sliderVal = hasSubmittedDials
                ? (mySubmission?.[dim.key] as number) ?? 50
                : draft[dim.key];
              const displayNum = avg !== null ? avg : (currentParticipant ? draft[dim.key] : 50);

              const dots = submittedRows.map((r) => {
                const p = participantById(r.participant_id);
                return {
                  id: r.participant_id,
                  color: colorForIdx(p?.color_idx ?? 0),
                  name: p?.name ?? "Unknown",
                  val: (r[dim.key] as number | null) ?? 0,
                  isMe: currentParticipant?.id === r.participant_id,
                };
              });

              return (
                <div
                  key={dim.key}
                  className="rounded-[10px] px-4 py-3.5 border-[0.5px] border-black/[0.08] bg-white"
                  style={hasSubmittedDials ? { opacity: 0.92 } : undefined}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-[13px] h-[13px] rounded-[3px] border-[1.5px] border-black/30" />
                    <div className="font-medium text-[13px] text-ink">{dim.label}</div>
                  </div>
                  <div className="text-xs text-ink-faint mb-2 pl-[21px]">{dim.help}</div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <div className="text-[28px] font-medium leading-none text-ink">
                      {displayNum}
                    </div>
                    <div className="text-[10px] text-ink-ghost">
                      {avg !== null
                        ? `team avg · ${dotCount}/${totalParticipants}`
                        : currentParticipant
                          ? "your guess"
                          : "—"}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={sliderVal}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [dim.key]: Number(e.target.value) }))
                    }
                    disabled={hasSubmittedDials || !currentParticipant}
                    style={
                      {
                        ["--thumb-color" as string]: myColor?.hex ?? "#888",
                        cursor: hasSubmittedDials ? "not-allowed" : undefined,
                      } as React.CSSProperties
                    }
                  />
                  {/* Submitted-value dot row. 12px dots with a whole-
                      pixel 2px white border so participants viewing
                      at non-100% zoom (89%, 110%, etc. on their own
                      laptops / phones) don't see sub-pixel rounding
                      make the dots look uneven. will-change:transform
                      promotes each dot to its own compositor layer
                      so anti-aliasing stays consistent regardless of
                      what neighbouring elements are painting. */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 16,
                      marginTop: 10,
                    }}
                  >
                    {dots.map((d) => (
                      <div
                        key={d.id}
                        title={`${d.name}: ${d.val}`}
                        style={{
                          position: "absolute",
                          display: "block",
                          left: `${d.val}%`,
                          top: "50%",
                          width: 12,
                          height: 12,
                          minWidth: 12,
                          minHeight: 12,
                          maxWidth: 12,
                          maxHeight: 12,
                          aspectRatio: "1 / 1",
                          padding: 0,
                          margin: 0,
                          borderRadius: "50%",
                          background: d.color.hex,
                          border: "2px solid #ffffff",
                          boxSizing: "border-box",
                          transform: "translate(-50%,-50%)",
                          willChange: "transform",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          zIndex: d.isMe ? 2 : 1,
                          flexShrink: 0,
                          flexGrow: 0,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-ghost mt-0.5">
                    <span>{dim.left}</span>
                    <span>{dim.right}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- Direction & pace pin scatter --- */}
          <div className="font-medium text-sm text-ink mb-0.5">
            Direction &amp; pace — drop your pin
          </div>
          <div className="text-xs text-ink-faint mb-3.5">
            Where does the program sit today?
          </div>

          <div
            className="relative w-full mx-auto rounded-[10px] mb-4"
            style={{
              maxWidth: 520,
              aspectRatio: "1 / 1",
              background: "#FAFAF7",
              border: "0.5px solid rgba(0,0,0,0.08)",
              cursor: currentParticipant ? "crosshair" : "default",
            }}
            onClick={(e) => {
              if (!currentParticipant) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
              dropPin(
                Math.max(0, Math.min(100, x)),
                Math.max(0, Math.min(100, y)),
              );
            }}
          >
            {/* Sweet-spot quadrant (top-right) */}
            <div
              className="absolute rounded-tr-[10px]"
              style={{
                top: 0,
                left: "50%",
                right: 0,
                bottom: "50%",
                background: "rgba(159,225,203,0.35)",
              }}
            />
            <div
              className="absolute top-0 bottom-0"
              style={{ left: "50%", width: 1, background: "rgba(0,0,0,0.12)" }}
            />
            <div
              className="absolute left-0 right-0"
              style={{ top: "50%", height: 1, background: "rgba(0,0,0,0.12)" }}
            />
            <div
              className="absolute text-[10px] tracking-[1px] text-ink-faint"
              style={{ top: 10, left: "50%", transform: "translateX(-50%)" }}
            >
              TOO FAST
            </div>
            <div
              className="absolute text-[10px] tracking-[1px] text-ink-faint"
              style={{ bottom: 10, left: "50%", transform: "translateX(-50%)" }}
            >
              TOO SLOW
            </div>
            <div
              className="absolute text-[10px] tracking-[1px] text-ink-faint"
              style={{
                left: 14,
                top: "50%",
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              OFF COURSE
            </div>
            <div
              className="absolute text-[10px] tracking-[1px] text-ink-faint"
              style={{
                right: 14,
                top: "50%",
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              ON COURSE
            </div>
            <div
              className="absolute text-[11px] font-medium"
              style={{ top: 12, right: 18, color: "#0F6E56" }}
            >
              Sweet spot
            </div>

            {/* Pins — pointer-events: none so the scatter click handler
                always fires (even when clicking near an existing pin). */}
            {participants.map((p) => {
              const sub = submissions.get(p.id);
              if (sub?.pin_x == null || sub?.pin_y == null) return null;
              const c = colorForIdx(p.color_idx);
              const isMe = currentParticipant?.id === p.id;
              return (
                <div
                  key={p.id}
                  className="absolute rounded-full border-2 border-white"
                  style={{
                    left: `${sub.pin_x}%`,
                    top: `${sub.pin_y}%`,
                    width: 14,
                    height: 14,
                    background: c.hex,
                    transform: "translate(-50%,-50%)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    opacity: isMe ? 1 : 0.55,
                    zIndex: isMe ? 2 : 1,
                    pointerEvents: "none",
                  }}
                  title={p.name}
                />
              );
            })}
          </div>

          <div className="flex justify-center gap-5 mb-4 text-[11px] text-ink-mute">
            {currentParticipant ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: myColor?.hex }}
                />
                You
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#aaa]" />
              Team so far (
              {Array.from(submissions.values()).filter(
                (s) => s.pin_x != null && s.pin_y != null,
              ).length}
              )
            </div>
          </div>

          {/* --- Submit / Edit row --- */}
          <div className="flex flex-wrap justify-between items-center pt-3.5 border-t-[0.5px] border-black/[0.08] gap-3">
            <div className="flex items-center gap-2.5 text-[11px] text-ink-faint">
              <span>
                {submittedRows.length} of {participants.length} submitted
              </span>
              <div className="flex gap-1">
                {participants.map((p) => {
                  const sub = submissions.get(p.id);
                  const submitted = !!(sub && sub.engagement != null);
                  const c = colorForIdx(p.color_idx);
                  return (
                    <div
                      key={p.id}
                      title={`${p.name}${submitted ? " ✓" : " — pending"}`}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: c.hex, opacity: submitted ? 1 : 0.25 }}
                    />
                  );
                })}
              </div>
            </div>
            {currentParticipant ? (
              hasSubmittedDials ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#0F6E56" }}>
                    ✓ You&apos;ve submitted
                  </span>
                  <button
                    onClick={unsubmitDials}
                    className="px-3 py-1.5 rounded-full text-[11px] border border-black/15 text-ink-mute bg-transparent hover:bg-black/[0.03]"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <PillButton onClick={submitDials} color="#1a1a2e">
                  Submit my answers →
                </PillButton>
              )
            ) : (
              <div className="text-xs text-ink-ghost">
                Join from the welcome page to submit
              </div>
            )}
          </div>
        </Card>

        {/* =========================== RETRO BOARD =========================== */}
        <Eyebrow color={COLORS[0].hex}>RETRO BOARD</Eyebrow>
        <h2 className="text-2xl font-medium text-navy mb-1.5">
          Continue / Stop / Change
        </h2>
        <p className="text-xs text-ink-faint mb-5">
          Capture what&apos;s working, what to drop, and what to do differently —
          for each lane.
        </p>

        <Card>
          <div
            className="grid gap-3 mb-3"
            style={{ gridTemplateColumns: "120px 1fr 1fr 1fr" }}
          >
            <div />
            {ACTIONS.map((a) => (
              <div
                key={a.key}
                className="text-center p-2 rounded-xl"
                style={{ background: a.bg, color: a.color }}
              >
                <div className="font-medium text-xs tracking-[1px]">{a.label}</div>
                <div className="text-[10px] opacity-80">{a.sub}</div>
              </div>
            ))}
          </div>

          {LANES.map((lane) => (
            <div
              key={lane.key}
              className="grid gap-3 mb-3"
              style={{ gridTemplateColumns: "120px 1fr 1fr 1fr" }}
            >
              <div
                className="rounded-xl flex items-center justify-center text-center px-2 py-4"
                style={{
                  background: COLORS[lane.colorIdx].tint,
                  color: COLORS[lane.colorIdx].dark,
                }}
              >
                <div className="font-medium text-[13px]">{lane.label}</div>
              </div>
              {ACTIONS.map((action) => (
                <RetroCell
                  key={action.key}
                  lane={lane.key}
                  action={action.key}
                  cards={retroCards.filter(
                    (c) => c.lane === lane.key && c.action === action.key,
                  )}
                  currentParticipantId={currentParticipant?.id ?? null}
                  participantById={participantById}
                  reactionsFor={(id) => reactions.get(id) ?? null}
                  onReact={(cardId, kind) =>
                    toggleReaction(
                      "retro_card",
                      cardId,
                      currentParticipant?.id ?? null,
                      kind,
                    )
                  }
                  onAdd={(text) => addRetroCard(lane.key, action.key, text)}
                />
              ))}
            </div>
          ))}
        </Card>
      </div>
    </main>
  );
}

// ============================================================
// RetroCell — one of six (2 lanes × 3 actions). Owns its own
// input draft so typing in one cell doesn't bleed into others.
// ============================================================
function RetroCell({
  lane,
  action,
  cards,
  currentParticipantId,
  participantById,
  reactionsFor,
  onReact,
  onAdd,
}: {
  lane: RetroLane;
  action: RetroAction;
  cards: RetroCard[];
  currentParticipantId: string | null;
  participantById: (id: string) => { id: string; name: string; color_idx: number } | null;
  reactionsFor: (
    entryId: string,
  ) => Partial<Record<ReactionKind, string[]>> | null;
  onReact: (cardId: string, kind: ReactionKind) => void;
  onAdd: (text: string) => void;
}) {
  void lane;
  void action; // not used inside the cell; render parent already filters
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  };

  return (
    <div
      className="rounded-xl p-3 min-h-[140px] min-w-0"
      style={{ background: "#FAFAF7", border: "0.5px solid rgba(0,0,0,0.05)" }}
    >
      {cards.map((card) => {
        const author = participantById(card.participant_id);
        const c = colorForIdx(author?.color_idx ?? 0);
        return (
          <div
            key={card.id}
            className="px-2.5 py-2 rounded-[10px] mb-1.5"
            style={{ background: c.tint, color: c.dark }}
          >
            <div className="text-xs break-words">{card.text}</div>
            <ReactionBar
              reactions={reactionsFor(card.id)}
              currentParticipantId={currentParticipantId}
              onToggle={(k) => onReact(card.id, k)}
              className="mt-1"
            />
          </div>
        );
      })}
      {currentParticipantId ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="+ add..."
          className="w-full mt-1 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white text-xs outline-none focus:border-navy"
        />
      ) : null}
    </div>
  );
}
