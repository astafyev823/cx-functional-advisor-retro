"use client";

// Session export to PDF. Heavy by design — @react-pdf/renderer ships
// its own layout engine. To keep this off the main bundle, the close
// page calls `exportSessionPdf` via dynamic import (only the click
// path pays the cost).

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { getSupabase } from "@/lib/supabase";

// ============================================================
// Types — shape of data the PDF document consumes.
// ============================================================

type Participant = { id: string; name: string; color_idx: number };

type HealthRow = {
  participant_id: string;
  engagement: number | null;
  energy: number | null;
  prioritisation: number | null;
  ways: number | null;
};

type Commitment = {
  id: string;
  participant_id: string;
  what: string;
  by_when: string;
  created_at: string;
};

type RetroCard = {
  id: string;
  participant_id: string;
  lane: "cx" | "vmo";
  action: "continue" | "stop" | "change";
  text: string;
  created_at: string;
};

type ReactionRow = {
  entry_type: string;
  entry_id: string;
  kind: "heart" | "like" | "q" | "green" | "amber" | "red";
};

type BauComment = {
  id: string;
  participant_id: string;
  option_id: string;
  text: string;
  created_at: string;
};

type OrgPin = {
  id: string;
  participant_id: string;
  text: string;
  month:
    | "jul"
    | "aug"
    | "sep"
    | "oct"
    | "nov"
    | "dec"
    | "jan"
    | null;
  created_at: string;
};

type NoteRow = {
  id: string;
  participant_id: string;
  text: string;
  created_at: string;
};

export type SessionExportData = {
  sessionCreatedAt: string;
  generatedAt: string; // ISO; rendered as DD Month YYYY
  participants: Participant[];
  health: HealthRow[];
  commitments: Commitment[];
  retroCards: RetroCard[];
  bauReactions: ReactionRow[];
  bauComments: BauComment[];
  orgPins: OrgPin[];
  bolderNotes: NoteRow[];
  bauNotes: NoteRow[];
  orgNotes: NoteRow[];
  finalReflections: NoteRow[];
};

// ============================================================
// Hardcoded BAU options — copy of the list on the BAU page so
// the PDF can be generated without importing client UI code.
// ============================================================

const BAU_OPTIONS: ReadonlyArray<{
  num: number;
  optionId: string;
  entryId: string;
  text: string;
}> = [
  {
    num: 1,
    optionId: "bau-option-1",
    entryId: "ba00ba00-0000-4000-8000-000000000001",
    text: "We continue as we are, workstream leads remain",
  },
  {
    num: 2,
    optionId: "bau-option-2",
    entryId: "ba00ba00-0000-4000-8000-000000000002",
    text: "Enablement workstreams close by December, embed enablement into ways of working and push for bolder",
  },
  {
    num: 3,
    optionId: "bau-option-3",
    entryId: "ba00ba00-0000-4000-8000-000000000003",
    text: "CXT ramps down and a smaller team remains to push bolder",
  },
  {
    num: 4,
    optionId: "bau-option-4",
    entryId: "ba00ba00-0000-4000-8000-000000000004",
    text: "Dissolve CXT completely and CXO owns bolder",
  },
  {
    num: 5,
    optionId: "bau-option-5",
    entryId: "ba00ba00-0000-4000-8000-000000000005",
    text: "Go bigger: Expand CXT to enterprise level under the chief transformation officer",
  },
];

const MONTHS: ReadonlyArray<{
  key: "jul" | "aug" | "sep" | "oct" | "nov" | "dec" | "jan";
  label: string;
}> = [
  { key: "jul", label: "July 2026" },
  { key: "aug", label: "August 2026" },
  { key: "sep", label: "September 2026" },
  { key: "oct", label: "October 2026" },
  { key: "nov", label: "November 2026" },
  { key: "dec", label: "December 2026" },
  { key: "jan", label: "January 2027" },
];

const DIALS: ReadonlyArray<{
  key: "engagement" | "energy" | "prioritisation" | "ways";
  label: string;
}> = [
  { key: "engagement", label: "Engagement" },
  { key: "energy", label: "Energy" },
  { key: "prioritisation", label: "Prioritisation" },
  { key: "ways", label: "Ways of working" },
];

// ============================================================
// Supabase fetch — read everything fresh on click.
// ============================================================

export async function fetchSessionExportData(
  sessionId: string,
): Promise<SessionExportData> {
  const sb = getSupabase();

  const [
    sessionRes,
    participantsRes,
    healthRes,
    commitmentsRes,
    retroRes,
    bauReactionsRes,
    bauCommentsRes,
    orgPinsRes,
    bolderNotesRes,
    bauNotesRes,
    orgNotesRes,
    finalRes,
  ] = await Promise.all([
    sb.from("sessions").select("created_at").eq("id", sessionId).single(),
    sb
      .from("participants")
      .select("id, name, color_idx")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true }),
    sb
      .from("health_submissions")
      .select("participant_id, engagement, energy, prioritisation, ways")
      .eq("session_id", sessionId),
    sb
      .from("commitments")
      .select("id, participant_id, what, by_when, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    sb
      .from("retro_cards")
      .select("id, participant_id, lane, action, text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    sb
      .from("reactions")
      .select("entry_type, entry_id, kind")
      .eq("session_id", sessionId)
      .eq("entry_type", "bau_option"),
    sb
      .from("bau_option_comments")
      .select("id, participant_id, option_id, text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    sb
      .from("org_pins")
      .select("id, participant_id, text, month, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    sb
      .from("bolder_notes")
      .select("id, participant_id, text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    sb
      .from("bau_notes")
      .select("id, participant_id, text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    sb
      .from("org_notes")
      .select("id, participant_id, text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    sb
      .from("final_reflections")
      .select("id, participant_id, text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const sessionCreatedAt =
    (sessionRes.data as { created_at?: string } | null)?.created_at ??
    new Date().toISOString();

  return {
    sessionCreatedAt,
    generatedAt: new Date().toISOString(),
    participants: (participantsRes.data ?? []) as Participant[],
    health: (healthRes.data ?? []) as HealthRow[],
    commitments: (commitmentsRes.data ?? []) as Commitment[],
    retroCards: (retroRes.data ?? []) as RetroCard[],
    bauReactions: (bauReactionsRes.data ?? []) as ReactionRow[],
    bauComments: (bauCommentsRes.data ?? []) as BauComment[],
    orgPins: (orgPinsRes.data ?? []) as OrgPin[],
    bolderNotes: (bolderNotesRes.data ?? []) as NoteRow[],
    bauNotes: (bauNotesRes.data ?? []) as NoteRow[],
    orgNotes: (orgNotesRes.data ?? []) as NoteRow[],
    finalReflections: (finalRes.data ?? []) as NoteRow[],
  };
}

// ============================================================
// Helpers — name resolution, formatting, dial spread maths.
// ============================================================

function resolveName(
  participantId: string,
  participants: Participant[],
): string {
  return (
    participants.find((p) => p.id === participantId)?.name ??
    "Unknown participant"
  );
}

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function exportFilename(generatedAt: string): string {
  return `cx-transformation-reflection-${formatDateShort(generatedAt)}.pdf`;
}

type DialStat = {
  key: "engagement" | "energy" | "prioritisation" | "ways";
  label: string;
  avg: number;
  spread: number;
  tight: boolean;
};

function dialStats(rows: HealthRow[]): DialStat[] {
  const submitted = rows.filter((r) => r.engagement != null);
  if (submitted.length === 0) return [];
  return DIALS.map((d) => {
    const vals = submitted
      .map((r) => r[d.key])
      .filter((v): v is number => v != null);
    if (vals.length === 0) {
      return { key: d.key, label: d.label, avg: 0, spread: 0, tight: true };
    }
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const spread = Math.max(...vals) - Math.min(...vals);
    return { key: d.key, label: d.label, avg, spread, tight: spread <= 22 };
  });
}

// ============================================================
// Styles — neutral report look. White / black / gray. No app colors.
// Default font is Helvetica (built into @react-pdf), a standard sans.
// ============================================================

const C = {
  ink: "#111111",
  body: "#222222",
  mute: "#666666",
  faint: "#888888",
  rule: "#dddddd",
  amber: "#C97A0E",
  bg: "#f8f8f6",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: C.body,
    lineHeight: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    fontSize: 9,
    color: C.mute,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerRule: {
    marginTop: 8,
    marginBottom: 22,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica",
    fontWeight: "medium",
    color: C.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: C.mute,
    marginBottom: 6,
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 13,
    fontFamily: "Helvetica",
    fontWeight: "medium",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.mute,
  },
  body: {
    fontSize: 12,
    color: C.body,
    lineHeight: 1.5,
  },
  bodySmall: {
    fontSize: 11,
    color: C.body,
    lineHeight: 1.5,
  },
  faint: {
    fontSize: 11,
    color: C.faint,
  },
  summaryBox: {
    backgroundColor: C.bg,
    borderLeftWidth: 3,
    borderLeftColor: C.ink,
    padding: 14,
    marginBottom: 4,
  },
  summaryStatsRow: {
    marginTop: 10,
    fontSize: 11,
    color: C.body,
  },
  // Table
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.ink,
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
    paddingVertical: 5,
  },
  tableColDimension: { flex: 3, fontSize: 11 },
  tableColAvg: { flex: 1.4, fontSize: 11 },
  tableColSpread: { flex: 1.6, fontSize: 11 },
  tableHeaderCell: {
    fontSize: 10,
    color: C.mute,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  italicNote: {
    marginTop: 8,
    fontSize: 11,
    color: C.mute,
    fontStyle: "italic",
  },
  // Commitments
  commitmentBlock: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  commitmentAuthor: { fontSize: 12, fontWeight: "medium", color: C.ink },
  commitmentText: { fontSize: 12, color: C.body, lineHeight: 1.5, marginTop: 2 },
  commitmentDue: { fontSize: 11, color: C.faint, marginTop: 3 },
  // Retro sub-headers
  retroLaneHeader: {
    marginTop: 10,
    marginBottom: 5,
    fontSize: 12,
    fontWeight: "medium",
    letterSpacing: 1,
    color: C.mute,
    textTransform: "uppercase",
  },
  retroActionHeader: {
    marginTop: 6,
    marginBottom: 3,
    fontSize: 10,
    color: C.mute,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  retroCard: {
    fontSize: 11,
    color: C.body,
    marginBottom: 2,
  },
  // BAU options
  bauOption: {
    marginBottom: 12,
  },
  bauOptionTitle: {
    fontSize: 12,
    fontWeight: "medium",
    color: C.ink,
    marginBottom: 3,
  },
  bauReactions: {
    fontSize: 11,
    color: C.mute,
    marginBottom: 3,
  },
  bauComment: {
    fontSize: 11,
    color: C.body,
    marginLeft: 14,
    marginBottom: 1.5,
  },
  // Org month
  orgMonthHeader: {
    marginTop: 8,
    marginBottom: 3,
    fontSize: 11,
    fontWeight: "medium",
    letterSpacing: 1,
    color: C.mute,
    textTransform: "uppercase",
  },
  orgPin: {
    fontSize: 12,
    color: C.body,
    marginBottom: 1.5,
  },
  // Notes subheading
  notesSubheading: {
    marginTop: 8,
    marginBottom: 3,
    fontSize: 12,
    fontWeight: "medium",
    color: C.ink,
  },
  noteLine: {
    fontSize: 12,
    color: C.body,
    marginBottom: 1.5,
  },
  questionLine: {
    fontSize: 12,
    fontWeight: "medium",
    color: C.ink,
    marginBottom: 8,
  },
  emptyLine: {
    fontSize: 11,
    fontStyle: "italic",
    color: C.faint,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "center",
    fontSize: 9,
    color: C.faint,
  },
});

// ============================================================
// Document — the React tree that @react-pdf renders.
// ============================================================

function PageFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <Text
      style={styles.footer}
      fixed
      render={({ pageNumber, totalPages }) =>
        `CX transformation reflection · ${formatDateLong(generatedAt)} · page ${pageNumber} of ${totalPages}`
      }
    />
  );
}

function ReactionTallyText({
  entryId,
  reactions,
}: {
  entryId: string;
  reactions: ReactionRow[];
}) {
  const tally: Record<string, number> = {};
  for (const r of reactions) {
    if (r.entry_id !== entryId) continue;
    tally[r.kind] = (tally[r.kind] ?? 0) + 1;
  }
  // Emoji mapping. We display these as actual emoji characters; @react-pdf
  // falls back to the built-in font for unsupported glyphs, but the
  // common ones (heart / thumbs / question mark) render acceptably.
  const order: ReadonlyArray<[string, string]> = [
    ["heart", "love"],
    ["like", "like"],
    ["q", "question"],
  ];
  const parts = order
    .filter(([k]) => (tally[k] ?? 0) > 0)
    .map(([k, label]) => `${tally[k]} ${label}`);
  if (parts.length === 0) {
    return <Text style={styles.bauReactions}>Reactions: none</Text>;
  }
  return <Text style={styles.bauReactions}>Reactions: {parts.join(" · ")}</Text>;
}

export function SessionPdfDocument({
  data,
}: {
  data: SessionExportData;
}): ReactElement {
  const {
    sessionCreatedAt,
    generatedAt,
    participants,
    health,
    commitments,
    retroCards,
    bauReactions,
    bauComments,
    orgPins,
    bolderNotes,
    bauNotes,
    orgNotes,
    finalReflections,
  } = data;

  void sessionCreatedAt; // session date is displayed via generatedAt;
                         // sessionCreatedAt available for future use.

  const stats = dialStats(health);
  const widestSpread = stats.reduce(
    (acc, s) => (s.spread > acc.spread ? s : acc),
    { label: "", spread: -1 } as { label: string; spread: number },
  );
  const allTight = stats.length > 0 && stats.every((s) => s.tight);

  const avgHealth =
    stats.length > 0
      ? Math.round(stats.reduce((a, b) => a + b.avg, 0) / stats.length)
      : null;

  const summaryStats: string[] = [];
  summaryStats.push(
    `avg health: ${avgHealth == null ? "—" : avgHealth}`,
  );
  summaryStats.push(`commitments: ${commitments.length}`);
  summaryStats.push(`retro cards: ${retroCards.length}`);
  summaryStats.push(`org pins: ${orgPins.length}`);
  summaryStats.push(`final reflections: ${finalReflections.length}`);

  return (
    <Document
      title="CX transformation: 7-month reflection"
      author="Jazz Pharmaceuticals"
    >
      <Page size="A4" style={styles.page}>
        {/* ===== HEADER ===== */}
        <View style={styles.headerRow} fixed>
          <Text>JAZZ PHARMACEUTICALS — INTERNAL</Text>
          <Text>{formatDateLong(generatedAt)}</Text>
        </View>
        <View style={styles.headerRule} fixed />

        <Text style={styles.title}>
          CX transformation: 7-month reflection
        </Text>
        <Text style={styles.subtitle}>
          Functional advisor session record · {participants.length} participants ·{" "}
          {formatDateLong(generatedAt)}
        </Text>

        {/* ===== 1. EXECUTIVE SUMMARY ===== */}
        <Text style={styles.sectionHeader}>1. Executive summary</Text>
        <View style={styles.summaryBox}>
          <Text style={styles.body}>
            {participants.length} functional advisor
            {participants.length === 1 ? "" : "s"} reflected on the first 7
            months of the CX transformation program. The room landed on{" "}
            {commitments.length} committed action
            {commitments.length === 1 ? "" : "s"}, contributed{" "}
            {retroCards.length} retro card
            {retroCards.length === 1 ? "" : "s"} across continue/stop/change,
            and submitted {orgPins.length} pin
            {orgPins.length === 1 ? "" : "s"} on the org evolution timeline.
          </Text>
          <Text style={styles.summaryStatsRow}>{summaryStats.join(" · ")}</Text>
        </View>

        {/* ===== 2. PROGRAM HEALTH CHECK ===== */}
        <Text style={styles.sectionHeader}>2. Program health check</Text>
        {stats.length === 0 ? (
          <Text style={styles.emptyLine}>
            No data captured in this section.
          </Text>
        ) : (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColDimension, styles.tableHeaderCell]}>
                Dimension
              </Text>
              <Text style={[styles.tableColAvg, styles.tableHeaderCell]}>
                Team avg
              </Text>
              <Text style={[styles.tableColSpread, styles.tableHeaderCell]}>
                Spread
              </Text>
            </View>
            {stats.map((s) => (
              <View key={s.key} style={styles.tableRow}>
                <Text style={styles.tableColDimension}>{s.label}</Text>
                <Text style={styles.tableColAvg}>{s.avg}</Text>
                <Text
                  style={
                    s.tight
                      ? styles.tableColSpread
                      : [styles.tableColSpread, { color: C.amber }]
                  }
                >
                  {s.spread} ({s.tight ? "tight" : "mixed"})
                </Text>
              </View>
            ))}
            <Text style={styles.italicNote}>
              {allTight
                ? "Tight consensus across all dimensions."
                : `The room's least aligned dimension is ${widestSpread.label} (${widestSpread.spread} points).`}
            </Text>
          </>
        )}

        {/* ===== 3. COMMITMENTS ===== */}
        <Text style={styles.sectionHeader}>3. Commitments</Text>
        {commitments.length === 0 ? (
          <Text style={styles.emptyLine}>No commitments captured.</Text>
        ) : (
          commitments.map((c) => (
            <View key={c.id} style={styles.commitmentBlock} wrap={false}>
              <Text style={styles.commitmentAuthor}>
                {resolveName(c.participant_id, participants)}
              </Text>
              <Text style={styles.commitmentText}>{c.what}</Text>
              <Text style={styles.commitmentDue}>
                Due: {c.by_when || "end of 2026"}
              </Text>
            </View>
          ))
        )}

        {/* ===== 4. RETRO BOARD ===== */}
        <Text style={styles.sectionHeader}>4. Retro board</Text>
        {retroCards.length === 0 ? (
          <Text style={styles.emptyLine}>No data captured in this section.</Text>
        ) : (
          (["cx", "vmo"] as const).map((lane) => {
            const laneCards = retroCards.filter((c) => c.lane === lane);
            if (laneCards.length === 0) return null;
            return (
              <View key={lane}>
                <Text style={styles.retroLaneHeader}>
                  {lane === "cx" ? "CX Transformation" : "VMO"}
                </Text>
                {(["continue", "stop", "change"] as const).map((action) => {
                  const cells = laneCards.filter((c) => c.action === action);
                  if (cells.length === 0) return null;
                  const label =
                    action === "continue"
                      ? "Continue"
                      : action === "stop"
                        ? "Stop"
                        : "Start / Change";
                  return (
                    <View key={action}>
                      <Text style={styles.retroActionHeader}>{label}</Text>
                      {cells.map((card) => (
                        <Text key={card.id} style={styles.retroCard}>
                          {resolveName(card.participant_id, participants)}:{" "}
                          {card.text}
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        {/* ===== 5. BAU DIRECTION ===== */}
        <Text style={styles.sectionHeader}>
          5. BAU direction — CXT&apos;s future role
        </Text>
        <Text style={styles.questionLine}>
          Question: What is the role of CXT when a new organization (e.g., CXO)
          goes live?
        </Text>
        {BAU_OPTIONS.map((opt) => {
          const optComments = bauComments.filter(
            (c) => c.option_id === opt.optionId,
          );
          return (
            <View key={opt.optionId} style={styles.bauOption}>
              <Text style={styles.bauOptionTitle}>
                Option {opt.num}: {opt.text}
              </Text>
              <ReactionTallyText
                entryId={opt.entryId}
                reactions={bauReactions}
              />
              {optComments.map((c) => (
                <Text key={c.id} style={styles.bauComment}>
                  {resolveName(c.participant_id, participants)}: {c.text}
                </Text>
              ))}
            </View>
          );
        })}

        {/* ===== 6. CX ORG EVOLUTION ===== */}
        <Text style={styles.sectionHeader}>6. CX org evolution</Text>
        <Text style={styles.questionLine}>
          Question: Are we heading in the right direction — and at the right
          pace — toward the future org?
        </Text>
        {orgPins.length === 0 ? (
          <Text style={styles.emptyLine}>No data captured in this section.</Text>
        ) : (
          <>
            {MONTHS.map((m) => {
              const monthPins = orgPins.filter((p) => p.month === m.key);
              if (monthPins.length === 0) return null;
              return (
                <View key={m.key} wrap={false}>
                  <Text style={styles.orgMonthHeader}>{m.label}</Text>
                  {monthPins.map((p) => (
                    <Text key={p.id} style={styles.orgPin}>
                      {resolveName(p.participant_id, participants)}: {p.text}
                    </Text>
                  ))}
                </View>
              );
            })}
            {(() => {
              const tray = orgPins.filter((p) => p.month == null);
              if (tray.length === 0) return null;
              return (
                <View wrap={false}>
                  <Text style={styles.orgMonthHeader}>Unassigned</Text>
                  {tray.map((p) => (
                    <Text key={p.id} style={styles.orgPin}>
                      {resolveName(p.participant_id, participants)}: {p.text}
                    </Text>
                  ))}
                </View>
              );
            })()}
          </>
        )}

        {/* ===== 7. BOLD TO BOLDER — NOTES ===== */}
        <Text style={styles.sectionHeader}>7. Bold to Bolder — notes</Text>
        <Text style={styles.questionLine}>
          Question: How do we support workstream leads in keeping an eye on the
          future while executing Bold today?
        </Text>
        {bolderNotes.length === 0 ? (
          <Text style={styles.emptyLine}>
            No notes captured in this section.
          </Text>
        ) : (
          bolderNotes.map((n) => (
            <Text key={n.id} style={styles.noteLine}>
              {resolveName(n.participant_id, participants)}: {n.text}
            </Text>
          ))
        )}

        {/* ===== 8. FINAL REFLECTIONS ===== */}
        <Text style={styles.sectionHeader}>8. Final reflections</Text>
        <Text style={styles.questionLine}>What people are taking away:</Text>
        {finalReflections.length === 0 ? (
          <Text style={styles.emptyLine}>No data captured in this section.</Text>
        ) : (
          finalReflections.map((r) => (
            <Text key={r.id} style={styles.noteLine}>
              {resolveName(r.participant_id, participants)}: {r.text}
            </Text>
          ))
        )}

        {/* ===== 9. NOTES (consolidated) ===== */}
        <Text style={styles.sectionHeader}>9. Notes (consolidated)</Text>
        {bauNotes.length === 0 && orgNotes.length === 0 ? (
          <Text style={styles.emptyLine}>No data captured in this section.</Text>
        ) : (
          <>
            {bauNotes.length > 0 ? (
              <View>
                <Text style={styles.notesSubheading}>BAU</Text>
                {bauNotes.map((n) => (
                  <Text key={n.id} style={styles.noteLine}>
                    {resolveName(n.participant_id, participants)}: {n.text}
                  </Text>
                ))}
              </View>
            ) : null}
            {orgNotes.length > 0 ? (
              <View>
                <Text style={styles.notesSubheading}>Org evolution</Text>
                {orgNotes.map((n) => (
                  <Text key={n.id} style={styles.noteLine}>
                    {resolveName(n.participant_id, participants)}: {n.text}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        )}

        <PageFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ============================================================
// Public API — build a Blob from the document and trigger
// browser download.
// ============================================================

export async function buildSessionPdfBlob(
  data: SessionExportData,
): Promise<Blob> {
  return pdf(<SessionPdfDocument data={data} />).toBlob();
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the click event a tick to fire before revoking the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSessionPdf(sessionId: string): Promise<void> {
  const data = await fetchSessionExportData(sessionId);
  const blob = await buildSessionPdfBlob(data);
  triggerDownload(blob, exportFilename(data.generatedAt));
}
