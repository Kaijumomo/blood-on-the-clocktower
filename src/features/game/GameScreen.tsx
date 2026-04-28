import { useEffect, useMemo, useState } from "react";
import { useStorytellerStore, selectScriptById } from "@/stores/storytellerStore";
import { GrimoireCircle } from "@/features/grimoire/GrimoireCircle";
import { PlayerDrawer } from "@/features/players/PlayerDrawer";
import { Almanac } from "@/features/almanac/Almanac";
import { NightOrderPanel } from "@/features/nightOrder/NightOrderPanel";
import { SetupPanel } from "@/features/setup/SetupPanel";
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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [backend, setBackend] = useState<RoomBackend | null>(null);
  const [nightPanelOpen, setNightPanelOpen] = useState(false);
  const [setupPanelOpen, setSetupPanelOpen] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const closeOverflow = () => setOverflowMenuOpen(false);

  // Auto-open night panel whenever phase transitions to "night".
  useEffect(() => {
    if (game?.phase === "night") setNightPanelOpen(true);
  }, [game?.phase]);

  // Auto-open setup panel whenever phase transitions to "setup".
  useEffect(() => {
    if (game?.phase === "setup") setSetupPanelOpen(true);
  }, [game?.phase]);

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
          console.error("[reconnect]", e instanceof Error ? e.message : e);
          setGoLiveError(friendlyFirebaseError(e, "st"));
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lobby, backend]);

  useStorytellerSync(backend, setSyncError);

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
      console.error("[goLive]", e instanceof Error ? e.message : e);
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
          {lobby && !backend && (
            <span className="phase-pill" style={{ opacity: 0.6 }}>Connecting…</span>
          )}
          {lobby && backend && (
            <span
              className="lobby-pill"
              title="Players join with this code"
            >
              code <strong>{lobby.code}</strong>
            </span>
          )}
        </div>
        {/* ⋮ toggle: visible only on narrow viewports via CSS */}
        <button
          className="btn btn-sm phase-bar-overflow-btn"
          onClick={() => setOverflowMenuOpen((o) => !o)}
          aria-label="More actions"
          aria-expanded={overflowMenuOpen}
        >
          ⋮
        </button>
        {overflowMenuOpen && (
          <div className="phase-overflow-backdrop" onClick={closeOverflow} />
        )}
        <div className={`phase-bar-right${overflowMenuOpen ? " open" : ""}`}>
          <button className="btn btn-sm" onClick={() => { closeOverflow(); setView("home"); }}>
            ← Home
          </button>
          <button className="btn btn-sm" onClick={() => { closeOverflow(); setAlmanacOpen(true); }}>
            Almanac
          </button>
          {game.phase === "setup" && (
            <button
              className="btn btn-sm"
              onClick={() => { closeOverflow(); setSetupPanelOpen((o) => !o); }}
              title={setupPanelOpen ? "Hide setup helper" : "Show setup helper"}
            >
              {setupPanelOpen ? "hide setup" : "setup"}
            </button>
          )}
          {game.phase === "night" && (
            <button
              className="btn btn-sm"
              onClick={() => { closeOverflow(); setNightPanelOpen((o) => !o); }}
              title={nightPanelOpen ? "Hide night order" : "Show night order"}
            >
              {nightPanelOpen ? "hide order" : "night order"}
            </button>
          )}
          {!lobby && (
            <button className="btn btn-sm" onClick={() => { closeOverflow(); goLive(); }} title="Create a Firebase lobby and start syncing">
              Go live
            </button>
          )}
          {lobby && (
            <button
              className="btn btn-sm"
              onClick={() => {
                closeOverflow();
                window.open(
                  `?display=public&code=${encodeURIComponent(lobby.code)}`,
                  "_blank",
                  "noopener"
                );
              }}
              title="Open the public projector view in a new tab"
            >
              Public display ↗
            </button>
          )}
          <button
            className="btn btn-sm"
            onClick={() => { closeOverflow(); undo(); }}
            disabled={undoStack.length === 0}
            title={`${undoStack.length} undo step${undoStack.length === 1 ? "" : "s"}`}
          >
            ↶ Undo
          </button>
          <button
            className="btn btn-gold"
            onClick={() => { closeOverflow(); advancePhase(); }}
            disabled={game.phase === "ended"}
          >
            {advanceLabel}
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              closeOverflow();
              if (window.confirm("End this game and return to home?")) {
                // Fire-and-forget: write status=ended to Firebase so players
                // are redirected immediately. Don't await — the local state
                // clears regardless of whether the network write succeeds.
                if (backend && lobby) {
                  endLobby(backend, lobby.code, game.seatOrder).catch((e) => {
                    // eslint-disable-next-line no-console
                    console.warn("[endLobby]", e instanceof Error ? e.message : e);
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

      {game.fabled.length > 0 && (
        <div className="fabled-strip">
          <span className="fabled-strip-label">Fabled</span>
          {game.fabled.map((id) => {
            const f = FABLED.find((x) => x.id === id);
            return (
              <span key={id} className="fabled-strip-item" title={f?.ability}>
                {f?.name ?? id}
              </span>
            );
          })}
        </div>
      )}

      <div className="game-body">
        {game.phase === "setup" && setupPanelOpen && script && (
          <SetupPanel
            game={game}
            script={script}
            onClose={() => setSetupPanelOpen(false)}
          />
        )}
        {game.phase === "night" && nightPanelOpen && script && (
          <NightOrderPanel
            game={game}
            script={script}
            onClose={() => setNightPanelOpen(false)}
          />
        )}
        <GrimoireCircle />
      </div>

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
      {syncError && (
        <div className="error-list lobby-error sync-error" role="alert">
          <strong>Sync issue</strong>
          <p>{syncError}</p>
          <button
            className="btn btn-sm"
            onClick={() => setSyncError(null)}
          >
            dismiss
          </button>
        </div>
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
