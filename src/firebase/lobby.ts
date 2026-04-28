// Lobby lifecycle: code generation, ST claim, player join knock, ST seating.
// All side-effects go through the injected RoomBackend.

import type { Json, RoomBackend } from "./backend";
import {
  lobbyStatusPath,
  playerPath,
  rosterEntryPath,
  rosterPath,
  storytellerUidPath,
} from "./paths";
import type { PlayerId, PlayerSelfRecord } from "@/stores/types";

// Confusable-glyph-free alphabet (no 0/O, 1/I/L). 30 chars, ~810k 4-char codes.
const ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";

export function generateCode(length = 4): string {
  let out = "";
  const arr =
    typeof globalThis.crypto !== "undefined"
      ? globalThis.crypto.getRandomValues(new Uint8Array(length))
      : null;
  for (let i = 0; i < length; i++) {
    const r = arr ? arr[i]! : Math.floor(Math.random() * 256);
    out += ALPHABET[r % ALPHABET.length];
  }
  return out;
}

const MAX_CREATE_ATTEMPTS = 20;

export async function createLobby(
  backend: RoomBackend,
  uid: string,
  options: { codeGenerator?: () => string } = {}
): Promise<{ code: string }> {
  const gen = options.codeGenerator ?? (() => generateCode());
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const code = gen();
    const claim = await backend.setIfAbsent(storytellerUidPath(code), uid);
    if (claim.committed) {
      return { code };
    }
  }
  throw new Error(
    `Could not allocate a lobby code after ${MAX_CREATE_ATTEMPTS} attempts.`
  );
}

// ---------------------------------------------------------------------------
// Roster transitions (see PROTOCOL.md)
// ---------------------------------------------------------------------------
// `roster/{uid}` is a string. Phase 1 = the player's requested name. Phase 2 =
// the playerId binding. We can tell which phase by checking whether the
// value matches a known playerId.

/** Player writes their requested name into roster/{uid}. Phase 1 of join. */
export async function knockOnLobby(
  backend: RoomBackend,
  code: string,
  uid: string,
  requestedName: string
): Promise<void> {
  const trimmed = requestedName.trim();
  if (!trimmed) throw new Error("Name is required.");
  // Use setIfAbsent so a refresh doesn't overwrite a server-bound playerId.
  await backend.setIfAbsent(rosterEntryPath(code, uid), trimmed);
}

/**
 * ST-side: atomically write the player's projection AND bind roster/{uid} to
 * the new playerId. The atomicity is critical when a self projection is
 * available — without it, the player would see roster/{uid} === playerId
 * before player/{playerId} exists.
 *
 * If `selfRecord` is null (the seat has no role yet), only the roster bind
 * is written. The player will read `null` from `player/{playerId}` until
 * the ST assigns a role and the next sync write fills it in. The UI handles
 * "no role yet" gracefully via the sealed-card placeholder.
 */
export async function seatPlayer(
  backend: RoomBackend,
  code: string,
  uid: string,
  playerId: PlayerId,
  selfRecord: PlayerSelfRecord | null
): Promise<void> {
  const updates: Record<string, Json> = {
    [rosterEntryPath(code, uid)]: playerId,
  };
  if (selfRecord) {
    updates[playerPath(code, playerId)] = selfRecord as unknown as Json;
  }
  await backend.update(updates);
}

/** Inspect a roster snapshot and classify each entry. */
export type RosterEntry =
  | { uid: string; phase: "knock"; name: string }
  | { uid: string; phase: "seated"; playerId: PlayerId };

export function classifyRoster(
  raw: Record<string, string> | null | undefined,
  knownPlayerIds: ReadonlySet<PlayerId>
): RosterEntry[] {
  if (!raw) return [];
  const entries: RosterEntry[] = [];
  for (const [uid, value] of Object.entries(raw)) {
    if (typeof value !== "string" || value.length === 0) continue;
    if (knownPlayerIds.has(value)) {
      entries.push({ uid, phase: "seated", playerId: value });
    } else {
      entries.push({ uid, phase: "knock", name: value });
    }
  }
  return entries;
}

/** Read roster/{uid} once. Used by a player on (re)connect to discover their playerId. */
export async function readOwnRosterEntry(
  backend: RoomBackend,
  code: string,
  uid: string
): Promise<{ phase: "absent" } | { phase: "knock"; name: string } | { phase: "seated"; playerId: PlayerId }> {
  const value = await backend.get(rosterEntryPath(code, uid));
  if (value === undefined || value === null) return { phase: "absent" };
  if (typeof value !== "string" || value.length === 0) return { phase: "absent" };
  // We don't know the set of seated playerIds without a full roster snapshot.
  // Caller decides; we return raw value with a "seated" guess that the caller
  // can override after fetching the full roster. For the player flow, the
  // caller checks against their own state.
  return { phase: "seated", playerId: value };
}

// ---------------------------------------------------------------------------
// Lobby lifecycle — status
// ---------------------------------------------------------------------------

/**
 * ST-side: mark a lobby as ended. Writes `status = "ended"` and
 * `endedAt = Date.now()` atomically. Players subscribed to the status path
 * will be notified immediately and shown the "Game ended" screen.
 */
export async function endLobby(
  backend: RoomBackend,
  code: string
): Promise<void> {
  // Write status="ended" to lobbies/${code}/public/status.
  // This path is covered by the already-deployed `public` rule:
  //   - ST write: ✓ (root.child(...storytellerUid) === auth.uid)
  //   - Player read: ✓ (roster member read on public/ cascades to children)
  // Using set() on a specific ref avoids a multi-path root update, which
  // would fail if any path in the batch has no deployed rule.
  await backend.set(lobbyStatusPath(code), "ended");
}

/**
 * Read lobby status once. Absent means the lobby is active (pre-close
 * lobbies have no status node). Returns "ended" only when explicitly set.
 */
export async function checkLobbyStatus(
  backend: RoomBackend,
  code: string
): Promise<"active" | "ended"> {
  const val = await backend.get(lobbyStatusPath(code));
  return val === "ended" ? "ended" : "active";
}

/**
 * Subscribe to lobby status changes. Fires immediately with the current
 * status, then on every change. Used by player clients to detect when the
 * ST has ended the game and tear down their session cleanly.
 */
export function watchLobbyStatus(
  backend: RoomBackend,
  code: string,
  cb: (status: "active" | "ended") => void
): () => void {
  return backend.subscribe(lobbyStatusPath(code), (value) => {
    cb(value === "ended" ? "ended" : "active");
  });
}

/** Watch the full roster object for changes. */
export function watchRoster(
  backend: RoomBackend,
  code: string,
  cb: (raw: Record<string, string> | null) => void
): () => void {
  return backend.subscribe(rosterPath(code), (value) => {
    if (value === undefined || value === null) {
      cb(null);
      return;
    }
    cb(value as Record<string, string>);
  });
}
