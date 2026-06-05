"use client";

import Link from "next/link";
import { useState } from "react";
import { BirthdayPresent } from "@/app/components/BirthdayPresent";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { PauseCard } from "@/app/components/PauseCard";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { useSession } from "@/app/components/SessionProvider";
import { COLORS, colorForIdx } from "@/lib/colors";
import { pageHref } from "@/lib/pages";
import { joinExistingRoom } from "@/lib/rooms";

const MORNING = [
  { title: "Let's celebrate our success",      mins: "30 min" },
  { title: "Program health check & retro",     mins: "45 min" },
  { title: "Commitments going forward",        mins: "30 min" },
];
const AFTERNOON = [
  { title: "Looking ahead: the rest of the year", mins: "40 min" },
  { title: "Closing reflections",                 mins: "20 min" },
];

export default function WelcomePage() {
  const { status, session, participants, currentParticipant } = useSession();

  if (status === "loading") {
    return (
      <main className="page-shell">
        <div className="text-sm text-ink-faint">Loading room…</div>
      </main>
    );
  }

  if (status === "not-found" || !session) {
    return (
      <main className="page-shell">
        <ShapesBg density="sparse" />
        <div className="relative z-10 max-w-md">
          <Eyebrow color="var(--color-rag-red)">ROOM NOT FOUND</Eyebrow>
          <h1 className="text-3xl font-medium text-navy mb-3 leading-tight">
            That code doesn&apos;t match a session.
          </h1>
          <p className="text-sm text-ink-mute mb-6">
            Double-check with whoever shared it, or start fresh.
          </p>
          <Link href="/">
            <PillButton>← Back to join</PillButton>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <ShapesBg density="full" />
      <div className="relative z-10">
        <div
          className="inline-block px-3.5 py-1.5 rounded-full text-xs font-medium text-white mb-4"
          style={{ background: COLORS[0].hex }}
        >
          Functional advisors · 7-month reflection
        </div>
        <h1 className="text-[38px] font-medium leading-[1.1] text-navy mb-5 max-w-[720px]">
          Welcome!{" "}
          <span
            className="px-2 rounded-md"
            style={{ background: COLORS[3].tint }}
          >
            Let&apos;s spend a day
          </span>{" "}
          reflecting.
        </h1>
        <p className="text-[15px] text-ink-mute leading-relaxed max-w-[560px] mb-8">
          Today we&apos;re taking stock of where the CX Transformation stands at the
          7-month mark. Move through the pages at your own pace — your
          contributions appear live for everyone in the room.
        </p>

        {!currentParticipant ? <JoinAsNew /> : null}

        <Card style={{ background: COLORS[1].tint }} className="max-w-[900px] mb-8 border-transparent">
          <Eyebrow color={COLORS[1].hex}>OUR GOAL FOR TODAY</Eyebrow>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: COLORS[1].dark }}
          >
            Take a meaningful pause at the 7-month mark to honestly assess where
            the CX Transformation stands — with a focus on impact over activity,
            program health, and direction. Leave with clear alignment on where
            we&apos;re going and what needs to change.
          </p>
        </Card>

        <Card className="max-w-[900px] mb-8">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow color={COLORS[2].hex} className="mb-0">IN THE ROOM</Eyebrow>
            <div className="text-xs text-ink-faint">
              {participants.length}{" "}
              {participants.length === 1 ? "person" : "people"}
            </div>
          </div>
          {participants.length === 0 ? (
            <div className="text-sm text-ink-faint italic">
              No one here yet — be the first to join.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const c = colorForIdx(p.color_idx);
                const isMe = currentParticipant?.id === p.id;
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: c.tint, color: c.dark }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: c.hex }} />
                    {p.name}
                    {isMe ? (
                      <span className="text-[10px] opacity-60 ml-0.5">(you)</span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        <div className="max-w-[900px]">
          <Eyebrow color={COLORS[2].hex}>AGENDA</Eyebrow>
          <h2 className="text-2xl font-medium text-navy mb-5">How we&apos;ll spend the day</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <Eyebrow color={COLORS[0].hex}>MORNING</Eyebrow>
              {MORNING.map((item) => (
                <div
                  key={item.title}
                  className="flex justify-between items-baseline mt-3"
                >
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: COLORS[1].hex }}
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] text-ink-ghost">{item.mins}</div>
                </div>
              ))}
            </Card>
            <Card>
              <Eyebrow color={COLORS[2].hex}>AFTERNOON</Eyebrow>
              {AFTERNOON.map((item) => (
                <div
                  key={item.title}
                  className="flex justify-between items-baseline mt-3"
                >
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: COLORS[1].hex }}
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] text-ink-ghost">{item.mins}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>

        {currentParticipant ? (
          <div className="mt-10">
            <Link href={pageHref(session.code, "celebrate")} prefetch>
              <PillButton>Start the session →</PillButton>
            </Link>
          </div>
        ) : null}

        <PauseCard
          emoji="🎂"
          title="Quick warm-up before we dig in"
          body="Go round the room: what was your best birthday, and why?"
          footer="Take 5 minutes."
          bgColor={COLORS[3].tint}
          textColor={COLORS[3].dark}
        />
      </div>
      <BirthdayPresent />
    </main>
  );
}

function JoinAsNew() {
  const { session, participants, setCurrentParticipant } = useSession();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!session) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const p = await joinExistingRoom(session, participants.length, name);
      setCurrentParticipant(p);
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : "Couldn't join — please retry.";
      setErr(msg);
      setBusy(false);
    }
  };

  const previewColor = colorForIdx(participants.length);

  return (
    <Card accent={COLORS[0].hex} className="mb-8 max-w-[560px]">
      <Eyebrow color={COLORS[0].hex}>JOIN THIS ROOM</Eyebrow>
      <h3 className="text-lg font-medium mb-3 text-navy">
        Add your name to the conversation.
      </h3>
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          autoComplete="given-name"
          className="flex-1 min-w-[180px] px-4 py-2.5 rounded-full border border-black/10 bg-white text-base outline-none focus:border-navy"
        />
        <PillButton type="submit" disabled={busy || !name.trim()}>
          {busy ? "Joining…" : "Join"}
        </PillButton>
      </form>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-faint">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ background: previewColor.hex }}
        />
        You&apos;ll join as <strong className="capitalize ml-0.5">{previewColor.name}</strong>{" "}
        · #{participants.length + 1} in the room.
      </div>
      {err ? (
        <div
          className="text-sm mt-2 px-3 py-2 rounded-lg"
          style={{
            background: "var(--color-rag-red-tint)",
            color: "var(--color-rag-red)",
          }}
        >
          {err}
        </div>
      ) : null}
    </Card>
  );
}
