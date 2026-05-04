import { useMemo } from "react";
import { useStorytellerStore } from "@/stores/storytellerStore";
import { analyzeBag, type SetupWarning } from "./setupAnalyzer";
import { FABLED } from "@/data/fabled";
import { LORICS } from "@/data/lorics";
import { jinxesForScript } from "@/data/jinxes";
import { lookupOfficialRole } from "@/data/officialRoles";
import type { Script, StorytellerLobbyRecord } from "@/stores/types";

type Props = {
  game: StorytellerLobbyRecord;
  script: Script;
  onClose: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  townsfolk: "T",
  outsider: "O",
  minion: "M",
  demon: "D",
};

function warningText(w: SetupWarning): string {
  switch (w.kind) {
    case "count-out-of-range":
      return `${w.count} players is outside the supported range (5–15).`;
    case "no-demon":
      return "No Demon is assigned.";
    case "multiple-demons":
      return `${w.count} Demons are assigned (expected 1).`;
    case "type-mismatch": {
      const base = `${w.type}: ${w.actual} assigned, ${w.expected} expected`;
      return w.reason ? `${base} (${w.reason})` : base;
    }
    case "setup-role-in-play":
      return `${w.roleName}: ${w.effectText}`;
  }
}

export function SetupPanel({ game, script, onClose }: Props) {
  const setFabled = useStorytellerStore((s) => s.setFabled);
  const setLorics = useStorytellerStore((s) => s.setLorics);

  const roleById = useMemo(
    () => new Map(script.characters.map((r) => [r.id, r])),
    [script.characters]
  );

  const analysis = useMemo(
    () => analyzeBag(game.players, roleById),
    [game.players, roleById]
  );

  const selectedFabled = new Set(game.fabled);
  const selectedLorics = new Set(game.lorics ?? []);

  const toggleFabled = (id: string) => {
    if (selectedFabled.has(id)) {
      setFabled(game.fabled.filter((f) => f !== id));
    } else {
      setFabled([...game.fabled, id]);
    }
  };

  const toggleLoric = (id: string) => {
    const current = game.lorics ?? [];
    if (selectedLorics.has(id)) {
      setLorics(current.filter((l) => l !== id));
    } else {
      setLorics([...current, id]);
    }
  };

  const activeJinxes = useMemo(() => {
    const inPlayCharacters = new Set(
      Object.values(game.players)
        .map((p) => p.actualRole)
        .filter(Boolean)
    );
    return jinxesForScript(script, [
      ...(game.lorics ?? []),
      ...(game.fabled ?? []),
      ...inPlayCharacters,
    ]);
  }, [script, game.lorics, game.fabled, game.players]);

  const bagTypes = ["townsfolk", "outsider", "minion", "demon"] as const;

  // Separate setup-role-in-play from other warnings.
  const setupNotes = analysis.warnings.filter(
    (w): w is Extract<SetupWarning, { kind: "setup-role-in-play" }> =>
      w.kind === "setup-role-in-play"
  );
  const otherWarnings = analysis.warnings.filter(
    (w) => w.kind !== "setup-role-in-play"
  );

  return (
    <aside className="setup-panel" aria-label="Setup helper">
      <div className="setup-panel-header">
        <h2 className="setup-panel-title">Setup</h2>
        <span className="setup-panel-summary">
          {analysis.nonTravelerCount} players
          {analysis.travelerCount > 0 && ` · ${analysis.travelerCount} traveler${analysis.travelerCount !== 1 ? "s" : ""}`}
          {analysis.unassignedCount > 0 && ` · ${analysis.unassignedCount} unassigned`}
        </span>
        <button className="btn btn-sm" onClick={onClose} aria-label="Close setup panel">
          ✕
        </button>
      </div>

      <div className="setup-panel-body">
        {/* Bag composition chips */}
        <div className="setup-bag-chips">
          {bagTypes.map((t) => {
            const actual = analysis.actual[t];
            const expected = analysis.expected?.[t] ?? null;
            const mismatch = expected !== null && actual !== expected;
            return (
              <div
                key={t}
                className={`setup-chip setup-chip-${t}${mismatch ? " mismatch" : ""}`}
                title={`${t}: ${actual} assigned${expected !== null ? `, ${expected} expected` : ""}`}
              >
                <span className="setup-chip-label">{TYPE_LABELS[t]}</span>
                <span className="setup-chip-count">
                  {actual}
                  {expected !== null && <span className="setup-chip-expected">/{expected}</span>}
                </span>
              </div>
            );
          })}
        </div>

        {/* Setup-role notes */}
        {setupNotes.length > 0 && (
          <div className="setup-section">
            <div className="setup-section-title">Setup roles in play</div>
            {setupNotes.map((w, i) => (
              <div key={i} className="setup-note">
                <span className="setup-note-name">{w.roleName}</span>
                <span className="setup-note-effect">{w.effectText}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {otherWarnings.length > 0 && (
          <div className="setup-section">
            <div className="setup-section-title">Warnings</div>
            {otherWarnings.map((w, i) => (
              <div key={i} className="setup-warning">
                <span className="setup-warning-icon">⚠</span>
                <span>{warningText(w)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fabled picker */}
        <div className="setup-section">
          <div className="setup-section-title">Fabled</div>
          <div className="fabled-chips">
            {FABLED.map((f) => (
              <button
                key={f.id}
                className={`fabled-chip${selectedFabled.has(f.id) ? " selected" : ""}`}
                aria-pressed={selectedFabled.has(f.id)}
                title={f.ability}
                onClick={() => toggleFabled(f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loric picker */}
        <div className="setup-section">
          <div className="setup-section-title">Lorics</div>
          <p className="behavior-help" style={{ margin: "0 0 6px" }}>
            Storyteller-controlled. Not seated, never die.
          </p>
          <div className="loric-chips">
            {LORICS.map((l) => (
              <button
                key={l.id}
                className={`loric-chip${selectedLorics.has(l.id) ? " selected" : ""}`}
                aria-pressed={selectedLorics.has(l.id)}
                title={l.ability}
                onClick={() => toggleLoric(l.id)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active jinxes */}
        {activeJinxes.length > 0 && (
          <div className="setup-section">
            <div className="setup-section-title">Jinxes ({activeJinxes.length})</div>
            <ul className="jinx-list">
              {activeJinxes.map((j, i) => {
                const a = lookupOfficialRole(j.a);
                const b = j.b === "any" ? null : lookupOfficialRole(j.b);
                return (
                  <li key={i} className="jinx-item">
                    <span className="jinx-pair">
                      <strong>{a?.name ?? j.a}</strong>
                      {" × "}
                      <strong>{b ? b.name : "any"}</strong>
                    </span>
                    <span className="jinx-reason">{j.reason}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
