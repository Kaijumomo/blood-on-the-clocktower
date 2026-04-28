import type { PlayerId, RoleDef, RoleId, RoleType, STPlayerRecord } from "@/stores/types";
import {
  SETUP_COUNTS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  type BagCounts,
} from "@/data/setupCounts";

export type { BagCounts };

export type SetupWarning =
  | { kind: "count-out-of-range"; count: number }
  | { kind: "type-mismatch"; type: RoleType; expected: number; actual: number; reason?: string }
  | { kind: "setup-role-in-play"; roleId: RoleId; roleName: string; effectText: string }
  | { kind: "no-demon" }
  | { kind: "multiple-demons"; count: number };

export type BagAnalysis = {
  nonTravelerCount: number;
  travelerCount: number;
  expected: BagCounts | null;
  actual: BagCounts;
  unassignedCount: number;
  warnings: SetupWarning[];
};

// Setup-shift role ids and their adjustments.
const SETUP_SHIFTS: Record<
  string,
  { townsfolk?: number; outsider?: number } | "godfather"
> = {
  baron:       { townsfolk: -2, outsider: +2 },
  fanggu:      { townsfolk: -1, outsider: +1 },
  vigormortis: { townsfolk: +1, outsider: -1 },
  godfather:   "godfather",
};

export function analyzeBag(
  players: Record<PlayerId, STPlayerRecord>,
  roleById: Map<RoleId, RoleDef>
): BagAnalysis {
  const all = Object.values(players);

  const travelers = all.filter((p) => p.isTraveler);
  const nonTravelers = all.filter((p) => !p.isTraveler);
  const assigned = nonTravelers.filter((p) => p.actualRole !== "");
  const unassigned = nonTravelers.filter((p) => p.actualRole === "");

  const actual: BagCounts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const p of assigned) {
    const def = roleById.get(p.actualRole);
    if (!def) continue;
    if (def.type === "townsfolk") actual.townsfolk++;
    else if (def.type === "outsider") actual.outsider++;
    else if (def.type === "minion") actual.minion++;
    else if (def.type === "demon") actual.demon++;
  }

  const warnings: SetupWarning[] = [];
  const nonTravelerCount = nonTravelers.length;

  // Emit setup-role-in-play notes for every setup:true role that is assigned.
  for (const p of assigned) {
    const def = roleById.get(p.actualRole);
    if (def?.setup && def.ability) {
      warnings.push({
        kind: "setup-role-in-play",
        roleId: def.id,
        roleName: def.name,
        effectText: def.ability,
      });
    }
  }

  // Demon count check (always).
  if (actual.demon === 0) {
    warnings.push({ kind: "no-demon" });
  } else if (actual.demon > 1) {
    warnings.push({ kind: "multiple-demons", count: actual.demon });
  }

  // Out-of-range check — skip per-type checks if out of range.
  if (nonTravelerCount < MIN_PLAYERS || nonTravelerCount > MAX_PLAYERS) {
    warnings.push({ kind: "count-out-of-range", count: nonTravelerCount });
    return {
      nonTravelerCount,
      travelerCount: travelers.length,
      expected: null,
      actual,
      unassignedCount: unassigned.length,
      warnings,
    };
  }

  const base = SETUP_COUNTS[nonTravelerCount]!;
  const expected: BagCounts = { ...base };

  let godfatherInPlay = false;

  // Apply fixed shifts.
  for (const p of assigned) {
    const shift = SETUP_SHIFTS[p.actualRole];
    if (!shift) continue;
    if (shift === "godfather") {
      godfatherInPlay = true;
      continue;
    }
    if (shift.townsfolk !== undefined) expected.townsfolk += shift.townsfolk;
    if (shift.outsider !== undefined) expected.outsider += shift.outsider;
  }

  // Type-mismatch checks.
  const types: Array<keyof BagCounts> = ["townsfolk", "outsider", "minion", "demon"];
  for (const t of types) {
    if (t === "outsider" && godfatherInPlay) {
      // Accept actual within [expected-1, expected+1]; otherwise warn.
      if (Math.abs(actual.outsider - expected.outsider) > 1) {
        warnings.push({
          kind: "type-mismatch",
          type: "outsider",
          expected: expected.outsider,
          actual: actual.outsider,
          reason: "Godfather: ±1 outsider",
        });
      }
      continue;
    }
    if (actual[t] !== expected[t]) {
      warnings.push({
        kind: "type-mismatch",
        type: t as RoleType,
        expected: expected[t],
        actual: actual[t],
      });
    }
  }

  return {
    nonTravelerCount,
    travelerCount: travelers.length,
    expected,
    actual,
    unassignedCount: unassigned.length,
    warnings,
  };
}
