"use client";

import { useState } from "react";
import { Banner } from "@/app/components/Banner";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { Modal } from "@/app/components/Modal";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PillButton } from "@/app/components/PillButton";
import { ReactionBar } from "@/app/components/ReactionBar";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { useEntries } from "@/hooks/useEntries";
import { useReactions, type ReactionKind } from "@/hooks/useReactions";
import { COLORS, colorForIdx } from "@/lib/colors";
import { getSupabase } from "@/lib/supabase";
import { STORIES, STATS, type Story, type Stat } from "./content";

type ProudMoment = {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  created_at: string;
};
type SuccessDef = ProudMoment;

export default function CelebratePage() {
  const { session, currentParticipant, participants } = useSession();
  const { items: proud } = useEntries<ProudMoment>("proud_moments", session?.id ?? null);
  const { items: defs } = useEntries<SuccessDef>("success_defs", session?.id ?? null);
  const { reactions, toggleReaction } = useReactions(session?.id ?? null);

  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [openStat, setOpenStat] = useState<Stat | null>(null);
  const [proudDraft, setProudDraft] = useState("");
  const [defDraft, setDefDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitProud = async () => {
    const text = proudDraft.trim();
    if (!text || !session || !currentParticipant || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("proud_moments").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("proud_moments insert", error);
    else setProudDraft("");
    setSubmitting(false);
  };

  const submitDef = async () => {
    const text = defDraft.trim();
    if (!text || !session || !currentParticipant || submitting) return;
    setSubmitting(true);
    const sb = getSupabase();
    const { error } = await sb.from("success_defs").insert({
      session_id: session.id,
      participant_id: currentParticipant.id,
      text,
    });
    if (error) console.error("success_defs insert", error);
    else setDefDraft("");
    setSubmitting(false);
  };

  const participantById = (id: string) =>
    participants.find((p) => p.id === id) ?? null;

  return (
    <main className="page-shell">
      <ShapesBg density="sparse" />
      <div className="relative z-10">
        {/* Hero banner */}
        <Banner
          background={COLORS[0].hex}
          className="text-center py-9 mb-8"
        >
          <div
            className="absolute rounded-full"
            style={{
              top: 12,
              right: 32,
              width: 48,
              height: 48,
              background: COLORS[3].hex,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: 12,
              left: 48,
              width: 32,
              height: 32,
              background: COLORS[2].hex,
            }}
          />
          <h1 className="text-[36px] font-medium text-white relative">
            We&apos;re 7 months in! 🎉
          </h1>
        </Banner>

        {/* Story tiles */}
        <Eyebrow color={COLORS[0].hex}>SUCCESSES & LEARNINGS</Eyebrow>
        <h2 className="text-2xl font-medium text-navy mb-4">
          Three stories from the last six months
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {STORIES.map((s) => {
            const c = COLORS[s.colorIdx];
            return (
              <button
                key={s.id}
                onClick={() => setOpenStory(s)}
                className="text-left rounded-2xl p-5 transition hover:-translate-y-1 min-h-[160px]"
                style={{ background: c.tint, color: c.dark }}
              >
                <div
                  className="w-9 h-9 rounded-full mb-3 flex items-center justify-center text-white font-medium"
                  style={{ background: c.hex }}
                >
                  ↗
                </div>
                <div className="font-medium text-sm mb-1.5">{s.subtitle}</div>
                <div className="text-xs opacity-85 leading-snug">{s.title}</div>
              </button>
            );
          })}
        </div>

        {/* Proud moments */}
        <Card className="mb-10">
          <Eyebrow color={COLORS[3].hex}>QUESTION FOR THE ROOM</Eyebrow>
          <h3 className="text-lg font-medium text-navy mb-4">
            What are you most proud of from the last 7 months? What&apos;s a moment
            that was meaningful to you?
          </h3>

          {currentParticipant ? (
            <div className="flex gap-2 mb-4">
              <input
                value={proudDraft}
                onChange={(e) => setProudDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitProud();
                }}
                placeholder="Share a moment..."
                className="flex-1 px-4 py-2.5 rounded-full border border-black/10 bg-white text-sm outline-none focus:border-navy"
              />
              <PillButton onClick={submitProud} disabled={!proudDraft.trim() || submitting}>
                Share
              </PillButton>
            </div>
          ) : (
            <div className="text-xs text-ink-faint mb-4">
              Join from the welcome page to share.
            </div>
          )}

          <div>
            {proud.length === 0 ? (
              <div className="text-[13px] italic text-ink-ghost p-3">
                Nothing shared yet — be the first.
              </div>
            ) : (
              proud.map((m) => {
                const p = participantById(m.participant_id);
                const c = colorForIdx(p?.color_idx ?? 0);
                return (
                  <div
                    key={m.id}
                    className="flex gap-3 p-3 rounded-xl mb-2"
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
                      <p className="text-sm" style={{ color: c.dark }}>
                        {m.text}
                      </p>
                      <ReactionBar
                        reactions={reactions.get(m.id) ?? null}
                        currentParticipantId={currentParticipant?.id ?? null}
                        onToggle={(k: ReactionKind) =>
                          toggleReaction("proud_moment", m.id, currentParticipant?.id ?? null, k)
                        }
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Stat tiles */}
        <h3 className="sr-only">By the numbers</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {STATS.map((s) => {
            const c = COLORS[s.colorIdx];
            return (
              <button
                key={s.id}
                onClick={() => setOpenStat(s)}
                className="text-left rounded-2xl p-5 transition hover:-translate-y-1.5 hover:scale-[1.02]"
                style={{ background: c.tint, color: c.dark }}
              >
                <div
                  className="font-medium leading-none mb-1"
                  style={{ color: c.hex, fontSize: 48 }}
                >
                  {s.num}
                </div>
                <div className="text-xs font-medium leading-tight">{s.label}</div>
                {s.sub ? (
                  <div className="text-[10px] mt-1 opacity-70">{s.sub}</div>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Big-question / success defs */}
        <div
          className="relative overflow-hidden rounded-3xl p-7 text-white"
          style={{ background: COLORS[1].hex }}
        >
          <div
            className="absolute rounded-full"
            style={{ top: 12, right: 20, width: 64, height: 64, background: COLORS[3].hex }}
          />
          <div
            className="absolute rounded-[10px]"
            style={{
              bottom: -20,
              right: 80,
              width: 40,
              height: 40,
              background: COLORS[0].hex,
              transform: "rotate(20deg)",
            }}
          />
          <div className="relative max-w-[60%]">
            <Eyebrow color={COLORS[3].hex}>THE BIG QUESTION</Eyebrow>
            <h2 className="text-2xl font-medium text-white mb-2 leading-snug">
              We&apos;ve done a lot of great work — but are we driving the{" "}
              <em className="not-italic" style={{ color: COLORS[3].hex }}>
                impact
              </em>{" "}
              we set out to achieve, or just{" "}
              <em className="not-italic" style={{ color: COLORS[3].hex }}>
                activity
              </em>
              ?
            </h2>
            <p className="text-[13px] opacity-80 mb-5">
              Rewrite your definition of success for the CX Transformation.
            </p>
            {currentParticipant ? (
              <div className="flex gap-2">
                <input
                  value={defDraft}
                  onChange={(e) => setDefDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitDef();
                  }}
                  placeholder="Success looks like..."
                  className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none border"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                />
                <PillButton
                  onClick={submitDef}
                  disabled={!defDraft.trim() || submitting}
                  color={COLORS[3].hex}
                >
                  Submit
                </PillButton>
              </div>
            ) : null}
          </div>
          {defs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 relative">
              {defs.map((d) => {
                const p = participantById(d.participant_id);
                return (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl flex gap-2"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <ParticipantBadge
                      name={p?.name ?? "?"}
                      colorIdx={p?.color_idx ?? 0}
                    />
                    <div className="flex-1">
                      <div className="text-[11px] font-medium mb-0.5">
                        {p?.name ?? "Unknown"}
                      </div>
                      <div className="text-[13px]">{d.text}</div>
                      <ReactionBar
                        reactions={reactions.get(d.id) ?? null}
                        currentParticipantId={currentParticipant?.id ?? null}
                        onToggle={(k: ReactionKind) =>
                          toggleReaction("success_def", d.id, currentParticipant?.id ?? null, k)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <Modal open={openStory !== null} onClose={() => setOpenStory(null)}>
        {openStory ? (
          <>
            <Eyebrow color={COLORS[openStory.colorIdx].hex}>{openStory.type}</Eyebrow>
            <h2 className="text-2xl font-medium text-navy mb-1.5">
              {openStory.title}
            </h2>
            <div className="text-[13px] text-ink-faint mb-5">
              {openStory.subtitle}
            </div>
            <div
              className="p-5 rounded-2xl text-sm leading-relaxed"
              style={{
                background: COLORS[openStory.colorIdx].tint,
                color: COLORS[openStory.colorIdx].dark,
              }}
            >
              {openStory.detail}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={openStat !== null} onClose={() => setOpenStat(null)}>
        {openStat ? (
          <>
            <div className="flex items-baseline gap-4 mb-5">
              <div
                className="font-medium leading-none"
                style={{ color: COLORS[openStat.colorIdx].hex, fontSize: 72 }}
              >
                {openStat.num}
              </div>
              <div>
                <div className="text-base font-medium text-navy">
                  {openStat.label}
                </div>
                {openStat.sub ? (
                  <div className="text-xs text-ink-faint">{openStat.sub}</div>
                ) : null}
              </div>
            </div>
            {openStat.items.map((it) => (
              <div
                key={it.name}
                className="p-3.5 rounded-xl mb-2.5"
                style={{ background: COLORS[openStat.colorIdx].tint }}
              >
                <div
                  className="font-medium text-sm mb-1"
                  style={{ color: COLORS[openStat.colorIdx].dark }}
                >
                  {it.name}
                </div>
                <div
                  className="text-[13px] leading-relaxed opacity-85"
                  style={{ color: COLORS[openStat.colorIdx].dark }}
                >
                  {it.desc}
                </div>
              </div>
            ))}
          </>
        ) : null}
      </Modal>
    </main>
  );
}
