import { useMemo, useState } from "react";
import { useStorytellerStore } from "@/stores/storytellerStore";
import { listBuiltinScripts, BUILTIN_SCRIPT_IDS } from "@/data/scripts";
import { listOfficialRoles } from "@/data/officialRoles";
import { ScriptImportDialog } from "@/features/scripts/ScriptImportDialog";
import { Almanac } from "@/features/almanac/Almanac";
import { FirebaseConfigDialog } from "@/features/firebase/FirebaseConfigDialog";
import { getConfigSource } from "@/firebase/config";

export function HomeScreen() {
  const game = useStorytellerStore((s) => s.game);
  const customScripts = useStorytellerStore((s) => s.customScripts);
  const newGame = useStorytellerStore((s) => s.newGame);
  const endGame = useStorytellerStore((s) => s.endGame);
  const setView = useStorytellerStore((s) => s.setView);
  const removeCustomScript = useStorytellerStore((s) => s.removeCustomScript);

  const [importOpen, setImportOpen] = useState(false);
  const [almanacOpen, setAlmanacOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [, forceRerender] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const configSource = getConfigSource();

  const allScripts = useMemo(
    () => [...listBuiltinScripts(), ...Object.values(customScripts)],
    [customScripts]
  );

  const officialRoles = useMemo(() => listOfficialRoles(), []);

  return (
    <div className="home">
      <h1 className="home-title">New Blood</h1>
      <p className="home-subtitle">
        A Storyteller-first digital grimoire for Blood on the Clocktower. Local
        only — your tablet, your table, your game.
      </p>
      <div className="home-actions">
        {game && (
          <button className="btn btn-gold" onClick={() => setView("game")}>
            Continue current game ({Object.keys(game.players).length} players)
          </button>
        )}
        {allScripts.map((s) => (
          <div key={s.id} className="home-script-row">
            <button
              className="btn home-script-btn"
              onClick={() => {
                if (
                  game &&
                  !window.confirm(
                    "Start a new game? The current game will be discarded."
                  )
                ) {
                  return;
                }
                newGame(s.id);
              }}
            >
              New game · {s.name}
              {!BUILTIN_SCRIPT_IDS.has(s.id) && (
                <span className="home-script-tag"> custom</span>
              )}
            </button>
            {!BUILTIN_SCRIPT_IDS.has(s.id) && (
              <button
                className="btn btn-sm btn-danger"
                aria-label={`Remove ${s.name}`}
                title="Remove imported script"
                onClick={() => {
                  if (window.confirm(`Remove imported script "${s.name}"?`)) {
                    removeCustomScript(s.id);
                  }
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button className="btn" onClick={() => setImportOpen(true)}>
          + Import script…
        </button>
        <button className="btn" onClick={() => setAlmanacOpen(true)}>
          Browse characters
        </button>
        {configSource !== "env" && (
          <button className="btn" onClick={() => setConfigOpen(true)}>
            {configSource === "localStorage"
              ? "Reconfigure Firebase"
              : "Configure Firebase…"}
          </button>
        )}
        <a className="btn home-player-link" href="?join=">
          Join a lobby (player)
        </a>
        {game && (
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (window.confirm("Discard the current saved game?")) {
                endGame();
              }
            }}
          >
            Discard saved game
          </button>
        )}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
      {importOpen && (
        <ScriptImportDialog
          onClose={() => setImportOpen(false)}
          onImported={(_id, name) => {
            setToast(`Imported "${name}"`);
            window.setTimeout(() => setToast(null), 2500);
          }}
        />
      )}
      {almanacOpen && (
        <Almanac
          title="Character library — all official roles"
          roles={officialRoles}
          onClose={() => setAlmanacOpen(false)}
        />
      )}
      {configOpen && (
        <FirebaseConfigDialog
          onClose={() => setConfigOpen(false)}
          onSaved={() => {
            forceRerender((n) => n + 1);
            setToast("Firebase configured");
            window.setTimeout(() => setToast(null), 2500);
          }}
        />
      )}
    </div>
  );
}
