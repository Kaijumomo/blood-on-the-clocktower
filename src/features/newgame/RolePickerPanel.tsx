import { useMemo } from "react";
import { iconUrlFor } from "@/data/iconUrl";
import { FABLED } from "@/data/fabled";
import { LORICS } from "@/data/lorics";
import { analyzeRolePool } from "./newGameAnalyzer";
import type { RoleDef, RoleId } from "@/stores/types";
import type { SetupWarning } from "@/features/setup/setupAnalyzer";

type Props = {
  scriptCharacters: RoleDef[];
  rolePool: RoleId[];
  plannedFabled: RoleId[];
  plannedLorics: RoleId[];
  plannedPlayerCount: number;
  onToggleRole: (id: RoleId) => void;
  onToggleFabled: (id: RoleId) => void;
  onToggleLoric: (id: RoleId) => void;
};

const BAG_TYPES = ["townsfolk", "outsider", "minion", "demon"] as const;
const TYPE_LABEL: Record<string, string> = {
  townsfolk: "Townsfolk",
  outsider: "Outsiders",
  minion: "Minions",
  demon: "Demons",
};
const TYPE_COLOR: Record<string, string> = {
  townsfolk: "type-townsfolk",
  outsider: "type-outsider",
  minion: "type-minion",
  demon: "type-demon",
};

function warningText(w: SetupWarning): string {
  switch (w.kind) {
    case "count-out-of-range":
      return `${w.count} players is outside the supported range (5–15).`;
    case "no-demon":
      return "No Demon selected.";
    case "multiple-demons":
      return `${w.count} Demons selected (expected 1).`;
    case "type-mismatch": {
      const base = `${w.type}: ${w.actual} selected, ${w.expected} expected`;
      return w.reason ? `${base} (${w.reason})` : base;
    }
    case "setup-role-in-play":
      return `${w.roleName}: ${w.effectText}`;
  }
}

type RoleTileProps = {
  role: RoleDef;
  selected: boolean;
  onToggle: () => void;
};

function RoleTile({ role, selected, onToggle }: RoleTileProps) {
  return (
    <button
      className={`ng-role-tile${selected ? " selected" : ""} ${TYPE_COLOR[role.type] ?? ""}`}
      onClick={onToggle}
      aria-pressed={selected}
      title={role.ability ?? role.name}
    >
      <img
        className="ng-role-art"
        src={iconUrlFor(role)}
        alt=""
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <span className="ng-role-name">{role.name}</span>
    </button>
  );
}

export function RolePickerPanel({
  scriptCharacters,
  rolePool,
  plannedFabled,
  plannedLorics,
  plannedPlayerCount,
  onToggleRole,
  onToggleFabled,
  onToggleLoric,
}: Props) {
  const roleById = useMemo(
    () => new Map(scriptCharacters.map((r) => [r.id, r])),
    [scriptCharacters]
  );

  const analysis = useMemo(
    () => analyzeRolePool(rolePool, plannedPlayerCount, roleById),
    [rolePool, plannedPlayerCount, roleById]
  );

  const poolSet = new Set(rolePool);
  const fabSet = new Set(plannedFabled);
  const loricSet = new Set(plannedLorics);

  const byType = useMemo(() => {
    const map = new Map<string, RoleDef[]>();
    for (const t of BAG_TYPES) map.set(t, []);
    for (const r of scriptCharacters) {
      if (BAG_TYPES.includes(r.type as typeof BAG_TYPES[number])) {
        map.get(r.type)!.push(r);
      }
    }
    return map;
  }, [scriptCharacters]);

  const setupNotes = analysis.warnings.filter(
    (w): w is Extract<SetupWarning, { kind: "setup-role-in-play" }> =>
      w.kind === "setup-role-in-play"
  );
  const otherWarnings = analysis.warnings.filter(
    (w) => w.kind !== "setup-role-in-play"
  );

  return (
    <div className="ng-picker">
      {/* Live bag count chips */}
      <div className="ng-picker-chips">
        {BAG_TYPES.map((t) => {
          const actual = analysis.actual[t];
          const expected = analysis.expected?.[t] ?? null;
          const mismatch = expected !== null && actual !== expected;
          return (
            <div
              key={t}
              className={`setup-chip setup-chip-${t}${mismatch ? " mismatch" : ""}`}
              title={`${t}: ${actual} selected${expected !== null ? `, ${expected} expected` : ""}`}
            >
              <span className="setup-chip-label">{t[0]!.toUpperCase()}</span>
              <span className="setup-chip-count">
                {actual}
                {expected !== null && (
                  <span className="setup-chip-expected">/{expected}</span>
                )}
              </span>
            </div>
          );
        })}
        <span className="ng-pool-total">
          {rolePool.length} / {plannedPlayerCount} in pool
        </span>
      </div>

      {/* Setup role notes */}
      {setupNotes.length > 0 && (
        <div className="setup-section">
          <div className="setup-section-title">Setup effects</div>
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
          {otherWarnings.map((w, i) => (
            <div key={i} className="setup-warning">
              <span className="setup-warning-icon">⚠</span>
              <span>{warningText(w)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Role grids by type */}
      {BAG_TYPES.map((t) => {
        const roles = byType.get(t) ?? [];
        if (roles.length === 0) return null;
        return (
          <div key={t} className="ng-type-section">
            <div className={`ng-type-heading ${TYPE_COLOR[t]}`}>
              {TYPE_LABEL[t]}
            </div>
            <div className="ng-role-grid">
              {roles.map((r) => (
                <RoleTile
                  key={r.id}
                  role={r}
                  selected={poolSet.has(r.id)}
                  onToggle={() => onToggleRole(r.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Fabled strip */}
      <div className="ng-type-section">
        <div className="ng-type-heading type-fabled">Fabled</div>
        <div className="ng-role-grid">
          {FABLED.map((f) => (
            <button
              key={f.id}
              className={`fabled-chip${fabSet.has(f.id) ? " selected" : ""}`}
              aria-pressed={fabSet.has(f.id)}
              title={f.ability}
              onClick={() => onToggleFabled(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lorics strip */}
      <div className="ng-type-section">
        <div className="ng-type-heading type-loric">Lorics</div>
        <div className="ng-role-grid">
          {LORICS.map((l) => (
            <button
              key={l.id}
              className={`loric-chip${loricSet.has(l.id) ? " selected" : ""}`}
              aria-pressed={loricSet.has(l.id)}
              title={l.ability}
              onClick={() => onToggleLoric(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
