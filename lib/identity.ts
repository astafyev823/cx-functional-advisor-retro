// Browser-side identity persistence. We have no auth in Phase 1 — a
// participant_id is just a UUID stashed in localStorage, keyed by the
// room code, so refresh keeps you signed in with the same color.
// (Resolved ambiguity g.)

const KEY = (code: string) => `cx:participant:${code.toUpperCase()}`;

export function getStoredParticipantId(roomCode: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY(roomCode));
  } catch {
    return null;
  }
}

export function storeParticipantId(roomCode: string, participantId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(roomCode), participantId);
  } catch {
    // Swallow quota/private-mode errors — losing identity persistence
    // is degraded but not broken; the user can rejoin.
  }
}

export function clearStoredParticipantId(roomCode: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY(roomCode));
  } catch {}
}
