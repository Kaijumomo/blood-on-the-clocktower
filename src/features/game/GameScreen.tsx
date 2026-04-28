import { useEffect, useMemo, useState } from "react";
import { useStorytellerStore, selectScriptById } from "@/stores/storytellerStore";
import { GrimoireCircle } from "@/features/grimoire/GrimoireCircle";
import { PlayerDrawer } from "@/features/players/PlayerDrawer";
import { Almanac } from "@/features/almanac/Almanac";
import { TRAVELERS } from "@/data/travelers";
import { FABLED } from "@/data/fabled";
import { connectFirebase } from "@/firebase/session";
import { isFirebaseConfigured } from "@/firebase/config";
import { createLobby, endLobby } from "@/firebase/lobby";
import { useStorytellerSync } from "@/firebase/storytellerSync";
import { FirebaseConfigDialog } from "@/features/firebase/FirebaseConfigDialog";
import { friendlyFirebaseError, type FriendlyError } from "@/firebase/errors";
import type { RoomBackend } from "@/firebase/backend";

const PHASE_LABEL: Record<string, string> = {
  setup: "Setup",
  night: "Night",
  day: "Day",
  ended: "Ended",
};

export function GameScreen() {
  const game = useStorytellerStore((s) => s.game);
  const script = useStorytellerStore((s) =>
    game ? selectScriptById(s, game.scriptId) : undefined
  );
  const lobby = useStorytellerStore((s) => s.lobby);
  const undoStack = useStorytellerStore((s) => s.undoStack);
  const undo = useStorytellerStore((s) => s.undo);
  const advancePhase = useStorytellerStore((s) => s.advancePhase);
  const endGame = useStorytellerStore((s) => s.endGame);
  const setView = useStorytellerStore((s) => s.setView);
  const setLobby = useStorytellerStore((s) => s.setLobby);
  const selectedPlayerId = useStorytellerStore((s) => s.selectedPlayerId);

  const [almanacOpen, setAlmanacOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [goLiveError, setGoLiveError] = useState<FriendlyError | null>(null);
  const [backend, setBackend] = useState<RoomBackend | null>(null);

  // Re-establish backend on mount when there's an existing lobby (reconnect path).
  useEffect(() => {
    let mounted = true;
    if (!lobby || backend) return;
    if (!isFirebaseConfigured()) return;
    (async () => {
      try {
        const { backend: b } = await connectFirebase();
        if (mounted) setBackend(b);
      } catch (e) {
        if (mounted) {
          // eslint-disable-next-line no-console
          console.error("[reconnect]", e);
          setGoLiveError(friendlyFirebaseError(e, "st"));
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lobby, backend]);

  useStorytellerSync(backend);

  const goLive = async () => {
    setGoLiveError(null);
    if (!isFirebaseConfigured()) {
      setConfigOpen(true);
      return;
    }
    try {
      const { backend: b, uid } = await connectFirebase();
      const { code } = await createLobby(b, uid);
      setBackend(b);
      setLobby({ code, uid, status: "live" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[goLive]", e);
      setGoLiveError(friendlyFirebaseError(e, "st"));
    }
  };

  const almanacRoles = useMemo(
    () => [...(script?.characters ?? []), ...TRAVELERS, ...FABLED],
    [script]
  );

  if (!game) return null;
  const selected = selectedPlayerId ? game.players[selectedPlayerId] : null;
  const playerCount = game.seatOrder.length;

  const advanceLabel =
    game.phase === "setup"
      ? "Begin night 1"
      : game.phase === "night"
        ? "→ Day"
        : game.phase === "day"
          ? "→ Night"
          : "Game ended";

  return (
    <div className="game" data-phase={game.phase}>
      <header className="phase-bar">
        <div className="phase-bar-left">
          <span className="phase-pill" data-phase={game.phase}>
            {PHASE_LABEL[game.phase] ?? game.phase}
          </span>
          {game.day > 0 && (
            <span className="day-counter">Day {game.day}</span>
          )}
          <span className="label">
            {playerCount} {playerCount === 1 ? "player" : "players"}
          </span>
          {lobby && (
            <span
              className="lobby-pill"
              title="Players join with this code"
            >
              code <strong>{lobby.code}</strong>
            </span>
          )}
        </div>
        <div className="phase-bar-right">
          <button className="btn btn-sm" onClick={() => setView("home")}>
            ← Home
          </button>
          <button className="btn btn-sm" onClick={() => setAlmanacOpen(true)}>
            Almanac
          </button>
          {!lobby && (
            <button className="btn btn-sm" onClick={goLive} title="Create a Firebase lobby and start syncing">
              Go live
            </button>
          )}
          <button
            className="btn btn-sm"
            onClick={undo}
            disabled={undoStack.length === 0}
            title={`${undoStack.length} undo step${undoStack.length === 1 ? "" : "s"}`}
          >
            ↶ Undo
          </button>
          <button
            className="btn btn-gold"
            onClick={advancePhase}
            disabled={game.phase === "ended"}
          >
            {advanceLabel}
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (window.confirm("End this game and return to home?")) {
                // Fire-and-forget: write status=ended to Firebase so players
                // are redirected immediately. Don't await — the local state
                // clears regardless of whether the network write succeeds.
                if (backend && lobby) {
                  endLobby(backend, lobby.code).catch((e) => {
                    // eslint-disable-next-line no-console
                    console.warn("[endLobby]", e);
                  });
                }
                endGame();
              }
            }}
          >
            End game
          </button>
        </div>
      </header>

      <GrimoireCircle />

      {selected && <PlayerDrawer player={selected} />}
      {almanacOpen && (
        <Almanac
          title={script ? `Almanac · ${script.name}` : "Almanac"}
          roles={almanacRoles}
          onClose={() => setAlmanacOpen(false)}
        />
      )}
      {configOpen && (
        <FirebaseConfigDialog
          onClose={() => setConfigOpen(false)}
          onSaved={() => {
            setConfigOpen(false);
            goLive();
          }}
        />
      )}
      {goLiveError && (
        <div className="error-list lobby-error" role="alert">
          <strong>{goLiveError.title}</strong>
          <p>{goLiveError.message}</p>
          <button
            className="btn btn-sm"
            onClick={() => setGoLiveError(null)}
          >
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}
