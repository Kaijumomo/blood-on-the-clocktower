// React hook that activates the ST-side Firebase sync when there's an
// active lobby. Behavior:
//   1. On mount (and whenever code/script changes), subscribe to roster
//      changes. Auto-seat new knocks.
//   2. Subscribe to local store changes; debounce 200ms; on each commit,
//      call writeProjections() with the latest STPlayerRecord and presence.
//   3. On unmount, unsubscribe everything.

import { useEffect, useRef } from "react";
import {
  selectScriptById,
  useStorytellerStore,
} from "@/stores/storytellerStore";
import { buildRegistry } from "@/data/roleRegistry";
import { classifyRoster, seatPlayer, watchRoster } from "./lobby";
import { writeProjections } from "./sync";
import type { OnlineMap } from "@/stores/projections";
import { projectToSelf } from "@/stores/projections";
import type { RoomBackend } from "./backend";
import type { PlayerId } from "@/stores/types";

const WRITE_DEBOUNCE_MS = 200;

type PresenceEntry = { online?: boolean; lastSeen?: number };
type PresenceMap = Record<string, PresenceEntry>; // keyed by uid
type RosterMap = Record<string, string>; // uid → playerId

function deriveOnlineMap(roster: RosterMap, presence: PresenceMap): OnlineMap {
  const out: OnlineMap = {};
  for (const [uid, value] of Object.entries(roster)) {
    // value is either a name (knock) or playerId (seated). We only care about
    // seated entries — only those have a stable id to map onto. Knocked
    // players don't have a seat yet, so they don't appear in the public roster.
    const playerId: PlayerId = value;
    const p = presence[uid];
    out[playerId] = !!p?.online;
  }
  return out;
}

export function useStorytellerSync(
  backend: RoomBackend | null,
  onSyncError?: (msg: string | null) => void,
  onPresenceUpdate?: (online: OnlineMap) => void
) {
  const lobby = useStorytellerStore((s) => s.lobby);

  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWrite = useRef<boolean>(false);

  // Presence + roster snapshots — refs so they aren't part of the effect
  // dependency array but are always read at flush time.
  const rosterRef = useRef<RosterMap>({});
  const presenceRef = useRef<PresenceMap>({});

  // ---- Sync loop: subscribe to store changes, debounce, project + write.
  useEffect(() => {
    if (!backend || !lobby) return;
    const code = lobby.code;

    const flush = async () => {
      pendingWrite.current = false;
      const state = useStorytellerStore.getState();
      const game = state.game;
      if (!game) return;
      const script = selectScriptById(state, game.scriptId);
      if (!script) return;
      const registry = buildRegistry(script);
      const online = deriveOnlineMap(rosterRef.current, presenceRef.current);
      try {
        await writeProjections({ backend, code, stState: game, registry, online });
        // Clear any previous sync error banner on success.
        onSyncError?.(null);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[sync] writeProjections failed:", e instanceof Error ? e.message : e);
        onSyncError?.("Last sync failed — retrying…");
      }
    };

    const schedule = () => {
      pendingWrite.current = true;
      if (writeTimer.current) return;
      writeTimer.current = setTimeout(() => {
        writeTimer.current = null;
        if (pendingWrite.current) flush();
      }, WRITE_DEBOUNCE_MS);
    };

    // Initial write (immediately re-uploads everything on (re)connect).
    flush();

    const unsubStore = useStorytellerStore.subscribe((s, prev) => {
      // Only react to game/lobby/customScripts changes — not view, drawer,
      // pendingKnocks (those don't affect Firebase paths).
      if (
        s.game !== prev.game ||
        s.lobby !== prev.lobby ||
        s.customScripts !== prev.customScripts
      ) {
        schedule();
      }
    });

    // Watch presence for the lobby. When a uid's online flips, schedule a
    // re-projection so the public roster carries the new value.
    const unsubPresence = backend.subscribe(
      `lobbies/${code}/presence`,
      (value) => {
        presenceRef.current = (value as PresenceMap | undefined) ?? {};
        if (onPresenceUpdate) {
          onPresenceUpdate(deriveOnlineMap(rosterRef.current, presenceRef.current));
        }
        schedule();
      }
    );

    return () => {
      unsubStore();
      unsubPresence();
      if (writeTimer.current) {
        clearTimeout(writeTimer.current);
        writeTimer.current = null;
      }
    };
  }, [backend, lobby?.code]);

  // ---- Roster watch: auto-seat knocks.
  useEffect(() => {
    if (!backend || !lobby) return;
    const code = lobby.code;

    const unsub = watchRoster(backend, code, async (raw) => {
      // Cache the roster for the presence merge — only seated entries (where
      // value is a known playerId) get an OnlineMap entry.
      const next: RosterMap = {};
      const state0 = useStorytellerStore.getState();
      const game0 = state0.game;
      const knownIds0 = new Set(Object.keys(game0?.players ?? {}));
      for (const [uid, value] of Object.entries(raw ?? {})) {
        if (typeof value === "string" && knownIds0.has(value)) {
          next[uid] = value;
        }
      }
      rosterRef.current = next;

      const state = useStorytellerStore.getState();
      const game = state.game;
      if (!game) return;
      const knownIds = new Set(Object.keys(game.players));
      const entries = classifyRoster(raw, knownIds);

      // Filter to genuine knocks: uid not yet bound to any player.
      const knocks = entries.filter((e) => e.phase === "knock");

      // Auto-seat each knock. We do this serially to avoid colliding
      // playerId allocations.
      for (const knock of knocks) {
        // After a previous iteration this knock may already have been seated;
        // re-read state.
        const cur = useStorytellerStore.getState();
        const curGame = cur.game;
        if (!curGame) break;

        // Skip if this uid is already bound.
        const alreadyBound = entries.some(
          (e) => e.uid === knock.uid && e.phase === "seated"
        );
        if (alreadyBound) continue;

        // Allocate a local player.
        const playerId = useStorytellerStore
          .getState()
          .seatPlayerFromKnock(knock.uid, knock.name);
        if (!playerId) continue;

        // Compute the player's self projection and atomically write it +
        // bind roster/{uid} → playerId.
        const refreshed = useStorytellerStore.getState();
        const game2 = refreshed.game;
        if (!game2) break;
        const player = game2.players[playerId];
        if (!player) continue;
        const script = selectScriptById(refreshed, game2.scriptId);
        if (!script) continue;
        const registry = buildRegistry(script);
        // A freshly-seated knocker has no role yet — pass null so seatPlayer
        // writes the roster binding only. The next writeProjections cycle
        // will fill in player/{id} once the ST assigns a role.
        const role = player.shownRole ?? player.actualRole;
        const self = role ? projectToSelf(player, registry) : null;
        try {
          await seatPlayer(backend, code, knock.uid, playerId, self);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[sync] seatPlayer failed:", e instanceof Error ? e.message : e);
          onSyncError?.(
            `Couldn't seat "${knock.name}" — they may be stuck on "Waiting". ` +
              "Check the console for details."
          );
        }
      }
    });

    return () => {
      unsub();
    };
  }, [backend, lobby?.code]);
}
