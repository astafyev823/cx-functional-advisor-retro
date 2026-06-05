"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// All reaction kinds the schema allows. heart/like/q for standard
// reaction bars; green/amber/red for trigger RAG ratings (ambiguity e).
export type ReactionKind = "heart" | "like" | "q" | "green" | "amber" | "red";
export const RAG_KINDS = ["green", "amber", "red"] as const;

// EntryType discriminates which kind of entry a reaction belongs to.
// Must match the schema's CHECK constraint on `reactions.entry_type`.
export type EntryType =
  | "proud_moment"
  | "success_def"
  | "retro_card"
  | "commitment"
  | "org_pin"
  | "bolder_trigger"
  | "bau_option";

type ReactionRow = {
  id: string;
  session_id: string;
  entry_type: EntryType;
  entry_id: string;
  participant_id: string;
  kind: ReactionKind;
};

// Canonical state: keyed by the reaction row's own UUID. This makes
// every INSERT/DELETE idempotent (Map.set with the same key replaces;
// Map.delete with an unknown key is a no-op) and means we never need
// the old payload to contain anything beyond the PK on a DELETE.
type ReactionsById = Map<string, ReactionRow>;

// Public projection consumed by <ReactionBar>: entry_id -> kind -> participant_ids.
export type ReactionMap = Map<string, Partial<Record<ReactionKind, string[]>>>;

export function useReactions(sessionId: string | null) {
  const [byId, setById] = useState<ReactionsById>(() => new Map());

  useEffect(() => {
    if (!sessionId) {
      setById(new Map());
      return;
    }
    let cancelled = false;
    const sb = getSupabase();

    (async () => {
      const { data, error } = await sb
        .from("reactions")
        .select("id, session_id, entry_type, entry_id, participant_id, kind")
        .eq("session_id", sessionId);
      if (cancelled) return;
      if (error) {
        console.error("[useReactions] fetch failed", error);
        return;
      }
      const next: ReactionsById = new Map();
      for (const r of (data ?? []) as ReactionRow[]) {
        next.set(r.id, r);
      }
      setById(next);
    })();

    const channel = sb
      .channel(`room:${sessionId}:reactions`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as ReactionRow;
            setById((prev) => {
              if (prev.has(r.id)) return prev; // already counted
              const next = new Map(prev);
              next.set(r.id, r);
              return next;
            });
            return;
          }
          if (payload.eventType === "DELETE") {
            // Default replica identity includes the PK (id), which is
            // all we need. REPLICA IDENTITY FULL is also set on this
            // table for redundancy.
            const r = payload.old as Partial<ReactionRow>;
            if (!r.id) return;
            setById((prev) => {
              if (!prev.has(r.id!)) return prev;
              const next = new Map(prev);
              next.delete(r.id!);
              return next;
            });
            return;
          }
          // We never UPDATE reactions, but if we did this row replaces
          // the existing one by id.
          if (payload.eventType === "UPDATE") {
            const r = payload.new as ReactionRow;
            setById((prev) => {
              const next = new Map(prev);
              next.set(r.id, r);
              return next;
            });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [sessionId]);

  // Derived view: group by entry_id, then by kind. Recomputed only when
  // the underlying byId map changes (Map identity changes on every
  // immutable update).
  const reactions: ReactionMap = useMemo(() => {
    const m: ReactionMap = new Map();
    for (const r of byId.values()) {
      let inner = m.get(r.entry_id);
      if (!inner) {
        inner = {};
        m.set(r.entry_id, inner);
      }
      const arr = inner[r.kind] ?? [];
      // The Map<rowId, row> guarantees no two rows have the same id,
      // but the same participant_id can theoretically appear if there
      // are two rows with different ids for the same (entry, kind,
      // participant). The DB unique constraint
      //   (entry_type, entry_id, participant_id, kind)
      // makes that impossible in practice, but we dedupe again here
      // so the array is still right if the constraint is ever relaxed.
      if (!arr.includes(r.participant_id)) arr.push(r.participant_id);
      inner[r.kind] = arr;
    }
    return m;
  }, [byId]);

  const toggleReaction = useCallback(
    async (
      entryType: EntryType,
      entryId: string,
      participantId: string | null,
      kind: ReactionKind,
      sessionIdArg: string | null = sessionId,
    ) => {
      if (!participantId || !sessionIdArg) return;
      const sb = getSupabase();

      // Look up the existing reaction row by (entry, participant, kind)
      // directly from the canonical byId state, not from the derived map.
      // This is the strongest signal of "did I react?" and avoids any
      // possibility of stale derived-state inconsistency.
      let mine: ReactionRow | undefined;
      for (const r of byId.values()) {
        if (
          r.entry_id === entryId &&
          r.kind === kind &&
          r.participant_id === participantId &&
          r.entry_type === entryType
        ) {
          mine = r;
          break;
        }
      }

      if (mine) {
        // Toggle off — delete by primary key for an exact, race-proof match.
        const { error } = await sb.from("reactions").delete().eq("id", mine.id);
        if (error) console.error("[toggleReaction:delete]", error);
        return;
      }

      // Toggle on — let the DB unique constraint handle the rare double-click race.
      const { error } = await sb.from("reactions").insert({
        session_id: sessionIdArg,
        entry_type: entryType,
        entry_id: entryId,
        participant_id: participantId,
        kind,
      });
      if (error && (error as { code?: string }).code !== "23505") {
        console.error("[toggleReaction:insert]", error);
      }
    },
    [byId, sessionId],
  );

  return { reactions, toggleReaction };
}
