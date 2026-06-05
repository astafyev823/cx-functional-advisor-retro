"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "@/lib/colors";

// Easter egg on the Welcome page. Local-only — clicking opens a birthday
// card modal for THIS browser only (no Supabase writes, no realtime).

const CONFETTI_COLORS = [
  COLORS[0].hex, // magenta
  COLORS[1].hex, // navy
  COLORS[2].hex, // cobalt
  COLORS[3].hex, // amber
  COLORS[4].hex, // lavender
];

const CONFETTI_COUNT = 50;

type ConfettiPiece = {
  id: number;
  color: string;
  left: number;     // 0..100 (% across viewport)
  size: number;     // px square
  duration: number; // seconds for one fall
  delay: number;    // negative so pieces are mid-fall on mount
  drift: number;    // px horizontal sway
  rotation: number; // total degrees over one cycle
};

function makeConfetti(): ConfettiPiece[] {
  // Math.random in render is fine — generated once per modal open and
  // never re-evaluated until the next open.
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: Math.random() * 100,
    size: 8 + Math.random() * 5,
    duration: 3 + Math.random() * 3,
    // Negative delay = piece is already partway through its fall on
    // mount, so the field looks alive immediately instead of a clump
    // dropping from the top in unison.
    delay: -Math.random() * 5,
    drift: (Math.random() - 0.5) * 220,
    rotation: 180 + Math.random() * 540 * (Math.random() < 0.5 ? -1 : 1),
  }));
}

export function BirthdayPresent() {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Fresh confetti seed each time the modal opens.
  const confetti = useMemo<ConfettiPiece[]>(
    () => (open ? makeConfetti() : []),
    [open],
  );

  // Body scroll lock + ESC + focus trap while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the close button so screen readers land somewhere sensible.
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        // The only focusable element inside the modal is the close
        // button, so Tab is a no-op — keep focus pinned.
        e.preventDefault();
        closeBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* The present icon. position:fixed, bottom-right, below the nav (z-40). */}
      <motion.button
        type="button"
        aria-label="Open birthday surprise"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 leading-none select-none p-0"
        style={{
          fontSize: 48,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          // Slight drop-shadow so the emoji reads against any background.
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
        }}
        whileHover={{
          y: [0, -12, 0],
          transition: {
            duration: 0.6,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.1,
          },
        }}
      >
        🎁
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="cx-birthday-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Birthday surprise"
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          >
            {/* Confetti layer — sits behind the card. pointer-events none
                so clicks fall through to the backdrop / card. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 overflow-hidden pointer-events-none"
            >
              {confetti.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-sm"
                  style={{
                    left: `${p.left}%`,
                    top: -20,
                    width: p.size,
                    height: p.size,
                    background: p.color,
                  }}
                  animate={{
                    y: ["0vh", "110vh"],
                    x: [0, p.drift],
                    rotate: [0, p.rotation],
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ))}
            </div>

            {/* The card itself. Stops click propagation so clicks on the
                card don't dismiss it. */}
            <motion.div
              className="relative rounded-3xl shadow-2xl"
              style={{
                width: "100%",
                maxWidth: 420,
                padding: 48,
                background: `linear-gradient(135deg, ${COLORS[0].tint} 0%, ${COLORS[2].tint} 50%, ${COLORS[4].tint} 100%)`,
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={closeBtnRef}
                type="button"
                aria-label="Close birthday card"
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/70 hover:bg-white border-none flex items-center justify-center transition"
                style={{
                  fontSize: 20,
                  lineHeight: 1,
                  color: COLORS[1].hex,
                  cursor: "pointer",
                }}
              >
                ×
              </button>

              <div className="text-center">
                <div style={{ fontSize: 40, lineHeight: 1 }} className="mb-4">
                  <span aria-hidden="true">🎉 🎂 🎈</span>
                </div>
                <div
                  className="font-medium leading-tight"
                  style={{ fontSize: 36, color: COLORS[1].hex }}
                >
                  Happy Birthday Jonathan!
                </div>
                <div
                  className="italic mt-3"
                  style={{
                    fontSize: 14,
                    color: COLORS[1].hex,
                    opacity: 0.7,
                  }}
                >
                  — from the VMO
                </div>
                <div
                  style={{ fontSize: 40, lineHeight: 1 }}
                  className="mt-5"
                >
                  <span aria-hidden="true">🎁 ✨ 🥳</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
