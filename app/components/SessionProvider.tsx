"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  fetchParticipants,
  findSessionByCode,
  type Participant,
  type Session,
} from "@/lib/rooms";
import { getStoredParticipantId, storeParticipantId } from "@/lib/identity";
import { getSupabase } from "@/lib/supabase";

type Status = "loading" | "not-found" | "loaded";

type Ctx = {
  status: Status;
  session: Session | null;
  participants: Participant[];
  currentParticipant: Participant | null;
  // Called by the inline join form on /r/[code] after createParticipant.
  // Persists identity to localStorage and inserts into the local list
  // (the realtime INSERT may also fire — we de-dupe by id).
  setCurrentParticipant: (p: Participant) => void;
};

const SessionCtx = createContext<Ctx | null>(null);

export function useSession(): Ctx {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function SessionProvider({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrent] = useState<Participant | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initial load: find session, fetch participants, restore identity
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSession(null);
    setParticipants([]);
    setCurrent(null);

    (async () => {
      try {
        const s = await findSessionByCode(code);
        if (cancelled) return;
        if (!s) {
          setStatus("not-found");
          return;
        }
        setSession(s);

        const ps = await fetchParticipants(s.id);
        if (cancelled) return;
        setParticipants(ps);

        const storedId = getStoredParticipantId(code);
        const cu = storedId ? ps.find((p) => p.id === storedId) ?? null : null;
        setCurrent(cu);
        setStatus("loaded");
      } catch (err) {
        console.error("[SessionProvider] load failed", err);
        if (!cancelled) setStatus("not-found");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  // Realtime: subscribe to participants for this session
  useEffect(() => {
    if (!session) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`room:${session.id}:participants`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setParticipants((prev) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as Participant;
              if (prev.some((p) => p.id === next.id)) return prev;
              return [...prev, next].sort((a, b) =>
                a.joined_at.localeCompare(b.joined_at),
              );
            }
            if (payload.eventType === "UPDATE") {
              const next = payload.new as Participant;
              return prev.map((p) => (p.id === next.id ? next : p));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id?: string };
              if (!old.id) return prev;
              return prev.filter((p) => p.id !== old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session?.id]);

  const setCurrentParticipant = useCallback(
    (p: Participant) => {
      storeParticipantId(code, p.id);
      setCurrent(p);
      setParticipants((prev) =>
        prev.some((x) => x.id === p.id) ? prev : [...prev, p],
      );
    },
    [code],
  );

  return (
    <SessionCtx.Provider
      value={{ status, session, participants, currentParticipant, setCurrentParticipant }}
    >
      {children}
    </SessionCtx.Provider>
  );
}
