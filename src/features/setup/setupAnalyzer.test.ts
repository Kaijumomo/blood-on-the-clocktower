import { describe, it, expect } from "vitest";
import { analyzeBag } from "./setupAnalyzer";
import type { RoleDef, STPlayerRecord } from "@/stores/types";

// Minimal role definitions for testing.
const R: Record<string, RoleDef> = {
  tf:          { id: "tf",          name: "Townsfolk",   type: "townsfolk" },
  tf2:         { id: "tf2",         name: "Townsfolk2",  type: "townsfolk" },
  tf3:         { id: "tf3",         name: "Townsfolk3",  type: "townsfolk" },
  os:          { id: "os",          name: "Outsider",    type: "outsider" },
  os2:         { id: "os2",         name: "Outsider2",   type: "outsider" },
  mn:          { id: "mn",          name: "Minion",      type: "minion" },
  dm:          { id: "dm",          name: "Demon",       type: "demon" },
  baron:       { id: "baron",       name: "Baron",       type: "minion", setup: true, ability: "[+2 Outsiders]" },
  fanggu:      { id: "fanggu",      name: "Fang Gu",     type: "demon",  setup: true, ability: "[+1 Outsider]" },
  vigormortis: { id: "vigormortis", name: "Vigormortis", type: "demon",  setup: true, ability: "[-1 Outsider]" },
  godfather:   { id: "godfather",   name: "Godfather",   type: "minion", setup: true, ability: "[±1 Outsider]" },
  traveler:    { id: "traveler",    name: "Traveler",    type: "traveler" },
};

function roleMap(...defs: RoleDef[]): Map<string, RoleDef> {
  return new Map(defs.map((d) => [d.id, d]));
}

let seat = 0;
function p(id: string, roleId: string, over: Partial<STPlayerRecord> = {}): STPlayerRecord {
  return {
    id,
    name: id,
    seat: seat++,
    joinedAt: 0,
    actualRole: roleId,
    shownRole: null,
    shownAlignment: null,
    behaviorMode: "normal",
    publicDisplayRole: null,
    alive: true,
    ghostVote: true,
    abilityUsed: false,
    statuses: {},
    reminders: [],
    stNotes: "",
    isTraveler: false,
    ...over,
  };
}

function makePlayers(records: STPlayerRecord[]): Record<string, STPlayerRecord> {
  return Object.fromEntries(records.map((r) => [r.id, r]));
}

describe("analyzeBag", () => {
  beforeEach(() => { seat = 0; });

  it("correct counts for a clean 7-player game (5T+0O+1M+1D)", () => {
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf2"), p("p3", "tf3"),
      p("p4", "tf"), p("p5", "tf"),
      p("p6", "mn"), p("p7", "dm"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.tf2!, R.tf3!, R.mn!, R.dm!));
    expect(result.nonTravelerCount).toBe(7);
    expect(result.travelerCount).toBe(0);
    expect(result.unassignedCount).toBe(0);
    expect(result.actual).toEqual({ townsfolk: 5, outsider: 0, minion: 1, demon: 1 });
    expect(result.expected).toEqual({ townsfolk: 5, outsider: 0, minion: 1, demon: 1 });
    expect(result.warnings).toEqual([]);
  });

  it("travelers excluded from nonTravelerCount and actual counts", () => {
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"),
      p("p4", "mn"), p("p5", "dm"),
      p("t1", "traveler", { isTraveler: true }),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.mn!, R.dm!, R.traveler!));
    expect(result.nonTravelerCount).toBe(5);
    expect(result.travelerCount).toBe(1);
    // 5-player: 3T+0O+1M+1D
    expect(result.actual).toEqual({ townsfolk: 3, outsider: 0, minion: 1, demon: 1 });
    expect(result.warnings).toEqual([]);
  });

  it("unassigned players excluded from actual counts but counted in nonTravelerCount", () => {
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"),
      p("p4", "tf"), p("p5", "mn"), p("p6", "dm"),
      p("p7", ""), // unassigned
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.mn!, R.dm!));
    expect(result.nonTravelerCount).toBe(7);
    expect(result.unassignedCount).toBe(1);
    // actual only counts assigned: 4T+0O+1M+1D vs expected 5T+0O+1M+1D
    expect(result.actual.townsfolk).toBe(4);
    const mismatch = result.warnings.find(
      (w) => w.kind === "type-mismatch" && w.type === "townsfolk"
    );
    expect(mismatch).toBeDefined();
  });

  it("Baron adds +2 outsiders / -2 townsfolk to expected", () => {
    // 9 players: base 5T+2O+1M+1D. With Baron: 3T+4O+1M+1D
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"),
      p("p4", "os"), p("p5", "os"), p("p6", "os2"), p("p7", "os"),
      p("p8", "baron"), p("p9", "dm"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.os!, R.os2!, R.baron!, R.dm!));
    expect(result.expected).toEqual({ townsfolk: 3, outsider: 4, minion: 1, demon: 1 });
    expect(result.actual).toEqual({ townsfolk: 3, outsider: 4, minion: 1, demon: 1 });
    expect(result.warnings.filter((w) => w.kind === "type-mismatch")).toHaveLength(0);
    expect(result.warnings.some((w) => w.kind === "setup-role-in-play" && w.roleId === "baron")).toBe(true);
  });

  it("Fang Gu adds +1 outsider / -1 townsfolk to expected", () => {
    // 7 players: base 5T+0O+1M+1D → with Fang Gu: 4T+1O+1M+1D (but Fang Gu is the demon)
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"), p("p4", "tf"),
      p("p5", "os"),
      p("p6", "mn"), p("p7", "fanggu"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.os!, R.mn!, R.fanggu!));
    expect(result.expected).toEqual({ townsfolk: 4, outsider: 1, minion: 1, demon: 1 });
    expect(result.actual).toEqual({ townsfolk: 4, outsider: 1, minion: 1, demon: 1 });
    expect(result.warnings.filter((w) => w.kind === "type-mismatch")).toHaveLength(0);
  });

  it("Vigormortis subtracts 1 outsider / adds 1 townsfolk to expected", () => {
    // 9 players: base 5T+2O+1M+1D → Vigormortis: 6T+1O+1M+1D
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"),
      p("p4", "tf"), p("p5", "tf"), p("p6", "tf"),
      p("p7", "os"),
      p("p8", "mn"), p("p9", "vigormortis"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.os!, R.mn!, R.vigormortis!));
    expect(result.expected).toEqual({ townsfolk: 6, outsider: 1, minion: 1, demon: 1 });
    expect(result.actual).toEqual({ townsfolk: 6, outsider: 1, minion: 1, demon: 1 });
    expect(result.warnings.filter((w) => w.kind === "type-mismatch")).toHaveLength(0);
  });

  it("Godfather: no mismatch when outsider count is within ±1 of expected", () => {
    // 7 players: base 5T+0O+1M+1D. Godfather is the minion (replaces mn).
    // ST chose 0 outsiders (valid: expected ±1 = [-1..1] clamped → [0..1]).
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"),
      p("p4", "tf"), p("p5", "tf"),
      p("p6", "godfather"), p("p7", "dm"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.godfather!, R.dm!));
    const outsiderMismatch = result.warnings.find(
      (w) => w.kind === "type-mismatch" && w.type === "outsider"
    );
    expect(outsiderMismatch).toBeUndefined();
  });

  it("Godfather: emits outsider type-mismatch with reason when count is outside ±1", () => {
    // 7 players, 3 outsiders present — expected 0, ±1 range = [-1..1], 3 is outside.
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"),
      p("p3", "os"), p("p4", "os"), p("p5", "os2"),
      p("p6", "godfather"), p("p7", "dm"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.os!, R.os2!, R.godfather!, R.dm!));
    const outsiderMismatch = result.warnings.find(
      (w) => w.kind === "type-mismatch" && w.type === "outsider"
    );
    expect(outsiderMismatch).toBeDefined();
    expect((outsiderMismatch as { reason?: string }).reason).toBe("Godfather: ±1 outsider");
  });

  it("emits no-demon when no demon is assigned", () => {
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"),
      p("p4", "tf"), p("p5", "tf"),
      p("p6", "mn"), p("p7", "mn"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.mn!));
    expect(result.warnings.some((w) => w.kind === "no-demon")).toBe(true);
  });

  it("emits multiple-demons when more than one demon is assigned", () => {
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "tf"),
      p("p4", "tf"), p("p5", "mn"),
      p("p6", "dm"), p("p7", "dm"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.mn!, R.dm!));
    expect(result.warnings.some((w) => w.kind === "multiple-demons")).toBe(true);
  });

  it("emits count-out-of-range and skips per-type checks for < 5 players", () => {
    const players = makePlayers([
      p("p1", "tf"), p("p2", "tf"), p("p3", "mn"), p("p4", "dm"),
    ]);
    const result = analyzeBag(players, roleMap(R.tf!, R.mn!, R.dm!));
    expect(result.expected).toBeNull();
    expect(result.warnings.some((w) => w.kind === "count-out-of-range")).toBe(true);
    expect(result.warnings.every((w) => w.kind !== "type-mismatch")).toBe(true);
  });
});
