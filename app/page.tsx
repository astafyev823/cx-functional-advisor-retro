"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/app/components/Card";
import { Eyebrow } from "@/app/components/Eyebrow";
import { PillButton } from "@/app/components/PillButton";
import { ShapesBg } from "@/app/components/ShapesBg";
import { storeParticipantId } from "@/lib/identity";
import { joinOrCreateRoom, normalizeCode } from "@/lib/rooms";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { session, participant } = await joinOrCreateRoom(code, name);
      storeParticipantId(session.code, participant.id);
      router.push(`/r/${session.code}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setBusy(false);
    }
  };

  const normalized = normalizeCode(code);
  const canSubmit = normalized.length >= 3 && name.trim().length > 0 && !busy;

  return (
    <main className="page-shell">
      <ShapesBg density="full" />
      <div className="relative z-10 max-w-xl">
        <div
          className="inline-block px-3.5 py-1.5 rounded-full text-xs font-medium text-white mb-4"
          style={{ background: "var(--color-magenta)" }}
        >
          Leadership session · 7-month reflection
        </div>
        <h1 className="text-[38px] font-medium leading-[1.1] mb-3 text-navy">
          Welcome.{" "}
          <span
            className="px-1 rounded-sm"
            style={{ background: "var(--color-amber-brand-tint)" }}
          >
            Let&apos;s spend a day
          </span>{" "}
          reflecting.
        </h1>
        <p className="text-[15px] text-ink-mute leading-relaxed mb-8 max-w-md">
          Enter the room code your facilitator shared, plus your name. You&apos;ll be
          assigned a color — your contributions will appear in that color throughout
          the day.
        </p>

        <Card>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label
                htmlFor="room-code"
                className="block text-[11px] font-medium tracking-[1.5px] text-ink-faint mb-1.5"
              >
                ROOM CODE
              </label>
              <input
                id="room-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. JAZZ6M"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-base outline-none focus:border-navy tracking-[2px] font-medium"
              />
            </div>
            <div>
              <label
                htmlFor="participant-name"
                className="block text-[11px] font-medium tracking-[1.5px] text-ink-faint mb-1.5"
              >
                YOUR NAME
              </label>
              <input
                id="participant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-base outline-none focus:border-navy"
              />
            </div>
            {error ? (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: "var(--color-rag-red-tint)",
                  color: "var(--color-rag-red)",
                }}
              >
                {error}
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-ink-faint">
                Code preview: <span className="font-medium text-ink-mute tracking-[2px]">{normalized || "—"}</span>
              </div>
              <PillButton type="submit" disabled={!canSubmit}>
                {busy ? "Joining…" : "Join →"}
              </PillButton>
            </div>
          </form>
          <div className="mt-4 pt-4 border-t border-black/5 text-xs text-ink-faint leading-relaxed">
            If the code doesn&apos;t exist yet, it&apos;ll be created — share it with the
            room so others can join. Refreshing keeps you signed in with the same
            color.
          </div>
        </Card>
      </div>
    </main>
  );
}
