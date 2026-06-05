"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// Room-wide RAG for the three top-of-page signals on Page 6. One row
// per (session, signal_key) — last-write-wins. See migration 003 and
// Mina's deviation on Page 6.

export type SignalKey = "s1" | "s2" | "s3";
export type SignalRating = "green" | "amber" | "red";

type ReadinessRow = {
  session_id: string;
  signal_key: SignalKey;
  rating: SignalRating;
  updated_at?: string;
};

export function useReadinessSignals(sessionId: string | null) {
  const [signals, setSignals] = useState<Map<SignalKey, SignalRating>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!sessionId) {
      setSignals(new Map());
      return;
    }
    let cancelled = false;
    const sb = getSupabase();

    (async () => {
      const { data, error } = await sb
        .from("readiness_signals")
        .select("signal_key, rating")
        .eq("session_id", sessionId);
      if (cancelled) return;
      if (error) {
        console.error("[useReadinessSignals] fetch failed", error);
        return;
      }
      const next = new Map<SignalKey, SignalRating>();
      for (const r of (data ?? []) as Pick<ReadinessRow, "signal_key" | "rating">[]) {
        next.set(r.signal_key, r.rating);
      }
      setSignals(next);
    })();

    const channel = sb
      .channel(`room:${sessionId}:readiness_signals`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "readiness_signals",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const r = payload.new as ReadinessRow;
            setSignals((prev) => {
              if (prev.get(r.signal_key) === r.rating) return prev;
              const next = new Map(prev);
              next.set(r.signal_key, r.rating);
              return next;
            });
            return;
          }
          if (payload.eventType === "DELETE") {
            // REPLICA IDENTITY FULL is set, so old has every column —
            // but only signal_key is needed.
            const r = payload.old as Partial<ReadinessRow>;
            if (!r.signal_key) return;
            setSignals((prev) => {
              if (!prev.has(r.signal_key as SignalKey)) return prev;
              const next = new Map(prev);
              next.delete(r.signal_key as SignalKey);
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

  // Click handler. If the user clicks the SAME color that's already
  // active for this signal, delete the row (toggle off). Otherwise
  // upsert with the new rating. Both branches optimistically update
  // local state; the realtime echo reconciles.
  const setSignal = useCallback(
    async (signalKey: SignalKey, rating: SignalRating) => {
      if (!sessionId) return;
      const sb = getSupabase();
      const current = signals.get(signalKey);

      if (current === rating) {
        // Toggle off — delete the row.
        setSignals((prev) => {
          if (!prev.has(signalKey)) return prev;
          const next = new Map(prev);
          next.delete(signalKey);
          return next;
        });
        const { error } = await sb
          .from("readiness_signals")
          .delete()
          .eq("session_id", sessionId)
          .eq("signal_key", signalKey);
        if (error) console.error("[setSignal:delete]", error);
        return;
      }

      // Set / replace — optimistic update + upsert on the composite PK.
      setSignals((prev) => {
        const next = new Map(prev);
        next.set(signalKey, rating);
        return next;
      });
      const { error } = await sb
        .from("readiness_signals")
        .upsert(
          {
            session_id: sessionId,
            signal_key: signalKey,
            rating,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id,signal_key" },
        );
      if (error) console.error("[setSignal:upsert]", error);
    },
    [sessionId, signals],
  );

  return { signals, setSignal };
}
