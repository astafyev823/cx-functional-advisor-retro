import { getSupabase } from "./supabase";

export type Session = {
  id: string;
  code: string;
  created_by_participant_id: string | null;
};

export type Participant = {
  id: string;
  session_id: string;
  name: string;
  color_idx: number;
  joined_at: string;
};

// Codes are uppercased, alphanumeric, 3–12 chars. Facilitators pick
// memorable words (JAZZ6M, CXMTG) — we don't generate them server-side.
const CODE_RE = /^[A-Z0-9]{3,12}$/;

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCode(code: string): boolean {
  return CODE_RE.test(code);
}

export async function findSessionByCode(code: string): Promise<Session | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sessions")
    .select("id, code, created_by_participant_id")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data as Session | null) ?? null;
}

async function createSession(code: string): Promise<Session> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sessions")
    .insert({ code })
    .select("id, code, created_by_participant_id")
    .single();
  if (error) throw error;
  return data as Session;
}

export async function fetchParticipants(sessionId: string): Promise<Participant[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("participants")
    .select("id, session_id, name, color_idx, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data as Participant[]) ?? [];
}

export async function createParticipant(
  sessionId: string,
  name: string,
  colorIdx: number,
): Promise<Participant> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("participants")
    .insert({ session_id: sessionId, name, color_idx: colorIdx })
    .select("id, session_id, name, color_idx, joined_at")
    .single();
  if (error) throw error;
  return data as Participant;
}

// Best-effort: stamp the first participant as creator. RLS is permissive
// in Phase 1 (no auth), so this is just bookkeeping — the reset button
// checks against this id at the app layer.
async function setSessionCreatorIfUnset(
  sessionId: string,
  participantId: string,
): Promise<void> {
  const sb = getSupabase();
  await sb
    .from("sessions")
    .update({ created_by_participant_id: participantId })
    .is("created_by_participant_id", null)
    .eq("id", sessionId);
}

// "Open" flow used by the join screen: find-or-create a session by code,
// then create a participant. Race-tolerant: if two tabs hit the same
// brand-new code simultaneously, the unique constraint on sessions.code
// resolves it (loser re-fetches).
export async function joinOrCreateRoom(
  rawCode: string,
  name: string,
): Promise<{ session: Session; participant: Participant; isNewSession: boolean }> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) {
    throw new Error("Room code must be 3–12 letters or numbers.");
  }
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Please enter your name.");
  }

  let session = await findSessionByCode(code);
  let isNewSession = false;
  if (!session) {
    try {
      session = await createSession(code);
      isNewSession = true;
    } catch (err: unknown) {
      const pgCode = (err as { code?: string } | null)?.code;
      if (pgCode === "23505") {
        // Race: another client just created it. Re-fetch.
        session = await findSessionByCode(code);
      } else {
        throw err;
      }
    }
    if (!session) {
      throw new Error("Couldn't create the room — please retry.");
    }
  }

  const existing = await fetchParticipants(session.id);
  const colorIdx = existing.length % 5;
  const participant = await createParticipant(session.id, trimmedName, colorIdx);

  if (!session.created_by_participant_id) {
    await setSessionCreatorIfUnset(session.id, participant.id);
  }

  return { session, participant, isNewSession };
}

// Inline join when someone visits a shared /r/[code] URL without an
// identity — same color-assignment rule as joinOrCreateRoom but the
// session is already known.
export async function joinExistingRoom(
  session: Session,
  participantCount: number,
  name: string,
): Promise<Participant> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Please enter your name.");
  const colorIdx = participantCount % 5;
  const participant = await createParticipant(session.id, trimmed, colorIdx);
  if (!session.created_by_participant_id) {
    await setSessionCreatorIfUnset(session.id, participant.id);
  }
  return participant;
}
