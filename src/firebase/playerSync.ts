// Player-side sync: watch roster/{ownUid} for the seating binding, then
// subscribe to player/{playerId} (self) and public/ (town).

import { useEffect } from "react";
import { usePlayerStore } from "@/stores/playerStore";
import { knockOnLobby } from "./lobby";
import {
  publicPath,
  rosterEntryPath,
  playerPath,
} from "./paths";
import type { RoomBackend } from "./backend";
import type { PlayerSelfRecord, PublicLobbyRecord } from "@/stores/types";
import { friendlyFirebaseError } from "./errors";

export async function joinLobby(
  backend: RoomBackend,
  code: string,
  uid: string,
  requestedName: string
): Promise<void> {
  const player = usePlayerStore.getState();
  try {
    // Knock immediately — we cannot read public/ before being in the roster,
    // so there is no reliable pre-join status check available to players.
    // If the lobby is already ended, the public/ subscription in usePlayerSync
    // fires immediately on subscribe (status="ended") and calls setEnded(),
    // redirecting the player before they see more than a brief "waiting" flash.
    player.setStatus("knocking");
    player.setSession({ code, uid, requestedName });
    await knockOnLobby(backend, code, uid, requestedName);
    player.setStatus("waiting");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[joinLobby]", e instanceof Error ? e.message : e);
    const friendly = friendlyFirebaseError(e, "player");
    player.setStatus("error", `${friendly.title}: ${friendly.message}`);
  }
}

export function usePlayerSync(backend: RoomBackend | null) {
  const code = usePlayerStore((s) => s.code);
  const uid = usePlayerStore((s) => s.uid);
  const playerId = usePlayerStore((s) => s.playerId);

  // Watch roster/{ownUid} for the playerId binding.
  useEffect(() => {
    if (!backend || !code || !uid) return;
    const unsub = backend.subscribe(rosterEntryPath(code, uid), (value) => {
      const ps = usePlayerStore.getState();
      // Guard: don't clobber "ended" status. After the public/ subscription
      // calls setEnded(), this effect's cleanup hasn't run yet — Firebase can
      // still deliver a buffered roster value. Without the guard, the fall-
      // through below would write setStatus("seated") over "ended".
      if (ps.status === "ended") return;
      if (typeof value !== "string" || value.length === 0) {
        // No roster entry; if we'd been seated and got removed, surface that.
        if (ps.playerId) {
          ps.setStatus("error", "Removed from lobby.");
          ps.setPlayerId(null);
          ps.setSelf(null);
        }
        return;
      }
      // Phase 1 (still knock) vs phase 2 (binding).
      if (value === ps.requestedName) {
        // Still a knock — waiting for ST to seat.
        ps.setStatus("waiting");
        return;
      }
      // Treat anything else as a playerId binding.
      ps.setPlayerId(value);
      ps.setStatus("seated");
    });
    return () => unsub();
  }, [backend, code, uid]);

  // Subscribe to own player/{playerId} once seated.
  // A permission probe runs first so that a stale reconnect (e.g. the game
  // ended and the player's session is no longer valid) surfaces a clear error
  // instead of hanging silently.
  useEffect(() => {
    if (!backend || !code || !playerId) return;
    let active = true;
    let cleanup: (() => void) | null = null;
    backend.get(playerPath(code, playerId)).then(() => {
      if (!active) return;
      cleanup = backend.subscribe(playerPath(code, playerId), (value) => {
        const ps = usePlayerStore.getState();
        if (ps.status === "ended") return;
        if (value === undefined || value === null) {
          ps.setSelf(null);
          return;
        }
        ps.setSelf(value as unknown as PlayerSelfRecord);
      });
    }).catch((e) => {
      if (!active) return;
      const friendly = friendlyFirebaseError(e, "player");
      usePlayerStore.getState().setStatus("error", `${friendly.title}: ${friendly.message}`);
    });
    return () => { active = false; cleanup?.(); };
  }, [backend, code, playerId]);

  // Subscribe to public/ — and detect lobby-ended from within the same
  // subscription. The ST writes status="ended" to public/status via endLobby();
  // this fires immediately on the next subscription tick. One subscription
  // handles both normal updates and the game-ended signal, so there is no
  // separate read on lobbies/${code}/status (which would need its own rule).
  // Permission probe guards against reconnecting to an already-ended lobby.
  useEffect(() => {
    if (!backend || !code) return;
    let active = true;
    let cleanup: (() => void) | null = null;
    backend.get(publicPath(code)).then(() => {
      if (!active) return;
      cleanup = backend.subscribe(publicPath(code), (value) => {
        const ps = usePlayerStore.getState();
        if (value === undefined || value === null) {
          ps.setPublic(null);
          return;
        }
        const pub = value as unknown as PublicLobbyRecord;
        if (pub.status === "ended") {
          ps.setEnded();
          return;
        }
        ps.setPublic(pub);
      });
    }).catch((e) => {
      if (!active) return;
      const friendly = friendlyFirebaseError(e, "player");
      usePlayerStore.getState().setStatus("error", `${friendly.title}: ${friendly.message}`);
    });
    return () => { active = false; cleanup?.(); };
  }, [backend, code]);
}
