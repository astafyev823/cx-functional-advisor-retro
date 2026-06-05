"use client";

import { useEffect } from "react";
import { PillButton } from "./PillButton";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Suppress the built-in "Close" PillButton. Use when the modal body
  // renders its own action row (e.g. Save / Cancel) so we don't end up
  // with two close-style buttons stacked.
  hideFooter?: boolean;
};

// Backdrop-clickable modal. Closes on Esc as well. Body scroll is locked
// while open so the page underneath doesn't drift on mobile.
export function Modal({ open, onClose, children, hideFooter = false }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(15, 27, 92, 0.6)", animation: "cx-fade-in 0.2s" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-[640px] max-h-[85vh] overflow-auto p-8 shadow-xl"
        style={{ animation: "cx-scale-in 0.2s" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {hideFooter ? null : (
          <div className="mt-6 text-right">
            <PillButton variant="secondary" onClick={onClose}>
              Close
            </PillButton>
          </div>
        )}
      </div>
    </div>
  );
}
