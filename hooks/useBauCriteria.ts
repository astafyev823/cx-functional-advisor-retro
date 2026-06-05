"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// The jsonb shape on bau_criteria.criteria. One row per session,
// last-write-wins on every drag/drop/add/delete (ambiguity d).
export type BauCriteriaShape = {
  must: string[];
  nice: string[];
  risk: string[];
  tray: string[];
};

export type BauColumn = keyof BauCriteriaShape;

// Seed defaults from the reference HTML. Inserted on first page load
// for a session if no row exists yet. Subsequent loads use whatever
// the room has shaped.
export const BAU_SEED: BauCriteriaShape = {
  must: [
    "Clear owner in receiving team",
    "Metrics & reporting in place",
  ],
  nice: ["Peer benchmarks documented"],
  risk: ["Funding model post-handover"],
  tray: [
    "Capability built in receiving team",
    "Governance & CXT touchpoints defined",
    "Risks & dependencies documented",
    "Run-rate budget agreed",
    "90-day exit support plan",
  ],
};

export function useBauCriteria(sessionId: string | null) {
  const [criteria, setCriteria] = useState<BauCriteriaShape | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setCriteria(null);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    const sb = getSupabase();

    (async () => {
      const { data, error } = await sb
        .from("bau_criteria")
        .select("criteria")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[useBauCriteria] fetch failed", error);
        setLoaded(true);
        return;
      }
      if (data) {
        setCriteria(data.criteria as BauCriteriaShape);
      } else {
        // First Page-4 load for this session — seed. Race-tolerant: if
        // two windows hit this simultaneously, the second will fail
        // 23505 and we ignore it (local state still ends up at SEED
        // and the realtime echo of the winning INSERT confirms).
        const { error: insertErr } = await sb
          .from("bau_criteria")
          .insert({ session_id: sessionId, criteria: BAU_SEED });
        if (insertErr && (insertErr as { code?: string }).code !== "23505") {
          console.error("[useBauCriteria] seed failed", insertErr);
        }
        setCriteria(BAU_SEED);
      }
      setLoaded(true);
    })();

    const channel = sb
      .channel(`room:${sessionId}:bau_criteria`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bau_criteria",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as { criteria: BauCriteriaShape };
            setCriteria(row.criteria);
          }
          // No DELETE handler — bau_criteria rows only go away via
          // session cascade, by which point the page is gone too.
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [sessionId]);

  // Optimistic full-blob write. The same blob is broadcast back via
  // realtime; we set local state first so the UI feels instant.
  const updateCriteria = useCallback(
    async (next: BauCriteriaShape) => {
      if (!sessionId) return;
      setCriteria(next);
      const sb = getSupabase();
      const { error } = await sb
        .from("bau_criteria")
        .update({ criteria: next, updated_at: new Date().toISOString() })
        .eq("session_id", sessionId);
      if (error) console.error("[useBauCriteria] update failed", error);
    },
    [sessionId],
  );

  return { criteria, loaded, updateCriteria };
}
