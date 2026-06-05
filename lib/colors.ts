// Single source of truth for participant colors. The order matches
// `participants.color_idx` (0..4) in the database, so DO NOT reorder.

export type ParticipantColor = {
  name: string;
  hex: string;
  tint: string;
  dark: string;
};

export const COLORS: ReadonlyArray<ParticipantColor> = [
  { name: "magenta",  hex: "#8E2D6F", tint: "#F4E4ED", dark: "#5e1d49" },
  { name: "navy",     hex: "#0F1B5C", tint: "#DDE0F0", dark: "#08113b" },
  { name: "cobalt",   hex: "#3D6BD3", tint: "#DCE4F7", dark: "#284791" },
  { name: "amber",    hex: "#C97A0E", tint: "#FDF1DE", dark: "#8a5208" },
  { name: "lavender", hex: "#7B5BA8", tint: "#E8DBEC", dark: "#4a3670" },
] as const;

export function colorForIdx(idx: number): ParticipantColor {
  return COLORS[((idx % COLORS.length) + COLORS.length) % COLORS.length];
}

// Assign the next participant a color by their join order, cycling
// through the palette. Matches the reference HTML's logic
// (`state.participants.length % COLORS.length`).
export function nextColorIdx(existingCount: number): number {
  return existingCount % COLORS.length;
}

// Fixed RAG palette (used for retro lanes & readiness signals & trigger ratings).
export const RAG = {
  green: { hex: "#3B6D11", tint: "#EAF3DE" },
  amber: { hex: "#C97A0E", tint: "#FDF1DE" },
  red:   { hex: "#A32D2D", tint: "#FCEBEB" },
} as const;

export type RagKey = keyof typeof RAG;

export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}
