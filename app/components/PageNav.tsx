"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/app/components/SessionProvider";
import { ParticipantBadge } from "@/app/components/ParticipantBadge";
import { PAGES, pageHref, pageNumFromPath } from "@/lib/pages";

// Sticky top navigation with 8 page tabs + a right-hand status panel
// showing the room code and the current participant's badge. Matches the
// reference HTML's <div class="nav"> structure (logo / pages / right).
export function PageNav({ code }: { code: string }) {
  const pathname = usePathname();
  const { session, participants, currentParticipant } = useSession();
  const activeNum = pageNumFromPath(pathname ?? "", code);

  return (
    <div
      className="sticky top-0 z-40 backdrop-blur-md border-b border-black/10"
      style={{ background: "rgba(251, 246, 239, 0.92)" }}
    >
      <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center gap-4">
        <Link
          href={pageHref(code, "")}
          className="font-medium text-[15px] text-navy whitespace-nowrap hover:opacity-80"
        >
          CX · 7 months in <span aria-hidden>👋</span>
        </Link>

        <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto">
          {PAGES.map((p) => {
            const active = p.num === activeNum;
            return (
              <Link
                key={p.num}
                href={pageHref(code, p.slug)}
                className={
                  "shrink-0 px-3 py-1.5 rounded-full text-xs transition whitespace-nowrap " +
                  (active
                    ? "bg-navy text-white font-medium"
                    : "text-ink-soft hover:bg-navy/[0.06]")
                }
              >
                {p.num}. {p.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {session ? (
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <div className="text-[10px] text-ink-faint tracking-wider">ROOM</div>
              <div className="text-xs font-medium text-navy tracking-[1.5px]">
                {session.code}
              </div>
            </div>
          ) : null}
          <div className="hidden sm:block text-[10px] text-ink-faint">
            {participants.length} in room
          </div>
          {currentParticipant ? (
            <ParticipantBadge
              name={currentParticipant.name}
              colorIdx={currentParticipant.color_idx}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
