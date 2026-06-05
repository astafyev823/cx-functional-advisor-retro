"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// Generic realtime hook: load every row in `table` matching session_id,
// then subscribe to changes. The table must (a) have `session_id` and
// `id` columns and (b) be enabled on the `supabase_realtime` publication.

export type Entry = { id: string; session_id: string; created_at?: string };

export function useEntries<T extends Entry>(
  table: string,
  sessionId: string | null,
  orderBy: string = "created_at",
): { items: T[]; loading: boolean } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const sb = getSupabase();

    (async () => {
      const { data, error } = await sb
        .from(table)
        .select("*")
        .eq("session_id", sessionId)
        .order(orderBy, { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error(`[useEntries:${table}] fetch failed`, error);
        setItems([]);
      } else {
        setItems((data ?? []) as T[]);
      }
      setLoading(false);
    })();

    const channel = sb
      .channel(`room:${sessionId}:${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const n = payload.new as T;
              if (prev.some((x) => x.id === n.id)) return prev;
              return [...prev, n].sort((a, b) =>
                String(a[orderBy as keyof T] ?? "").localeCompare(
                  String(b[orderBy as keyof T] ?? ""),
                ),
              );
            }
            if (payload.eventType === "UPDATE") {
              const n = payload.new as T;
              return prev.map((x) => (x.id === n.id ? n : x));
            }
            if (payload.eventType === "DELETE") {
              const o = payload.old as { id?: string };
              if (!o.id) return prev;
              return prev.filter((x) => x.id !== o.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [table, sessionId, orderBy]);

  return { items, loading };
}
