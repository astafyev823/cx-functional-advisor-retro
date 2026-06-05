"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// One row per (session, participant). Dials are nullable until that
// person hits "Submit my answers"; pin_x/pin_y are nullable independently
// (ambiguity c — dropping a pin is decoupled from submitting dials).
export type HealthSubmission = {
  session_id: string;
  participant_id: string;
  engagement: number | null;
  energy: number | null;
  prioritisation: number | null;
  ways: number | null;
  pin_x: number | null;
  pin_y: number | null;
  submitted_at: string | null;
  updated_at: string;
};

export function useHealthSubmissions(sessionId: string | null) {
  // Canonical state: participant_id -> row. Composite PK (session_id,
  // participant_id) means there's exactly one row per person in this
  // session, so participant_id is a safe key.
  const [submissions, setSubmissions] = useState<Map<string, HealthSubmission>>(
    () => new Map(),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setSubmissions(new Map());
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    const sb = getSupabase();

    (async () => {
      const { data, error } = await sb
        .from("health_submissions")
        .select("*")
        .eq("session_id", sessionId);
      if (cancelled) return;
      if (error) {
        console.error("[useHealthSubmissions] fetch failed", error);
        setLoaded(true);
        return;
      }
      const next = new Map<string, HealthSubmission>();
      for (const row of (data ?? []) as HealthSubmission[]) {
        next.set(row.participant_id, row);
      }
      setSubmissions(next);
      setLoaded(true);
    })();

    const channel = sb
      .channel(`room:${sessionId}:health_submissions`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "health_submissions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as HealthSubmission;
            setSubmissions((prev) => {
              const next = new Map(prev);
              next.set(row.participant_id, row);
              return next;
            });
            return;
          }
          if (payload.eventType === "DELETE") {
            // PK is (session_id, participant_id); both columns are part
            // of the default replica identity, so payload.old has them.
            const row = payload.old as Partial<HealthSubmission>;
            if (!row.participant_id) return;
            setSubmissions((prev) => {
              if (!prev.has(row.participant_id!)) return prev;
              const next = new Map(prev);
              next.delete(row.participant_id!);
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

  return { submissions, loaded };
}
