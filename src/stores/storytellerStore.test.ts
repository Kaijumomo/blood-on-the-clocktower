import { beforeEach, describe, expect, it } from "vitest";
import { useStorytellerStore, selectScriptById } from "./storytellerStore";
import type { Script } from "./types";

const minimalScript = (id: string, name = "Test Script"): Script => ({
  id,
  name,
  characters: [
    {
      id: "x",
      name: "X",
      type: "townsfolk",
      ability: "Does X.",
    },
  ],
});

beforeEach(() => {
  useStorytellerStore.setState({
    game: null,
    view: "home",
    undoStack: [],
    selectedPlayerId: null,
    customScripts: {},
  });
  // Clear persisted state from a prior run (jsdom localStorage).
  localStorage.clear();
});

describe("addCustomScript", () => {
  it("accepts a unique custom script", () => {
    const result = useStorytellerStore
      .getState()
      .addCustomScript(minimalScript("hb-1", "Homebrew One"));
    expect(result.ok).toBe(true);
    expect(useStorytellerStore.getState().customScripts["hb-1"]).toBeDefined();
  });

  it("rejects a script id that collides with a built-in", () => {
    const r1 = useStorytellerStore.getState().addCustomScript(minimalScript("tb"));
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toMatch(/built-in/i);

    const r2 = useStorytellerStore.getState().addCustomScript(minimalScript("snv"));
    expect(r2.ok).toBe(false);
  });

  it("rejects a duplicate custom-script id", () => {
    const a = useStorytellerStore.getState().addCustomScript(minimalScript("dup"));
    expect(a.ok).toBe(true);
    const b = useStorytellerStore.getState().addCustomScript(minimalScript("dup"));
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.error).toMatch(/already imported/i);
  });
});

describe("removeCustomScript", () => {
  it("removes the script from state", () => {
    useStorytellerStore.getState().addCustomScript(minimalScript("hb-2"));
    useStorytellerStore.getState().removeCustomScript("hb-2");
    expect(useStorytellerStore.getState().customScripts["hb-2"]).toBeUndefined();
  });

  it("ends the active game if it uses the removed script", () => {
    useStorytellerStore.getState().addCustomScript(minimalScript("hb-3"));
    useStorytellerStore.getState().newGame("hb-3");
    expect(useStorytellerStore.getState().game).not.toBeNull();
    useStorytellerStore.getState().removeCustomScript("hb-3");
    expect(useStorytellerStore.getState().game).toBeNull();
    expect(useStorytellerStore.getState().view).toBe("home");
  });

  it("leaves an unrelated active game alone", () => {
    useStorytellerStore.getState().addCustomScript(minimalScript("hb-4"));
    useStorytellerStore.getState().newGame("tb");
    useStorytellerStore.getState().removeCustomScript("hb-4");
    expect(useStorytellerStore.getState().game).not.toBeNull();
  });
});

describe("newGame supports both built-in and custom scripts", () => {
  it("creates a game from a built-in script id", () => {
    useStorytellerStore.getState().newGame("snv");
    const g = useStorytellerStore.getState().game;
    expect(g).not.toBeNull();
    expect(g?.scriptId).toBe("snv");
    expect(useStorytellerStore.getState().view).toBe("game");
  });

  it("creates a game from a custom script id", () => {
    useStorytellerStore.getState().addCustomScript(minimalScript("hb-5"));
    useStorytellerStore.getState().newGame("hb-5");
    expect(useStorytellerStore.getState().game?.scriptId).toBe("hb-5");
  });

  it("throws on an unknown script id", () => {
    expect(() => useStorytellerStore.getState().newGame("ghost")).toThrow(
      /Unknown script id/
    );
  });
});

describe("selectScriptById", () => {
  it("resolves built-in script ids", () => {
    const s = selectScriptById(useStorytellerStore.getState(), "tb");
    expect(s?.id).toBe("tb");
  });

  it("resolves custom script ids", () => {
    useStorytellerStore.getState().addCustomScript(minimalScript("hb-6"));
    const s = selectScriptById(useStorytellerStore.getState(), "hb-6");
    expect(s?.id).toBe("hb-6");
  });

  it("returns undefined for unknown ids", () => {
    expect(selectScriptById(useStorytellerStore.getState(), "ghost")).toBeUndefined();
  });
});

describe("Lunatic / deception state", () => {
  function setupTBGame(): { p1: string; p2: string; p3: string } {
    useStorytellerStore.getState().newGame("tb");
    useStorytellerStore.getState().addPlayer("Alice");
    useStorytellerStore.getState().addPlayer("Bob");
    useStorytellerStore.getState().addPlayer("Cara");
    const order = useStorytellerStore.getState().game!.seatOrder;
    return { p1: order[0]!, p2: order[1]!, p3: order[2]! };
  }

  it("setBluffs writes bluffs into privateInfo", () => {
    const { p1 } = setupTBGame();
    useStorytellerStore.getState().setBluffs(p1, ["chef", "saint", "virgin"]);
    const player = useStorytellerStore.getState().game!.players[p1]!;
    expect(player.privateInfo?.bluffs).toEqual(["chef", "saint", "virgin"]);
  });

  it("setBluffs([]) drops the bluffs key (and privateInfo if empty)", () => {
    const { p1 } = setupTBGame();
    useStorytellerStore.getState().setBluffs(p1, ["chef"]);
    useStorytellerStore.getState().setBluffs(p1, []);
    const player = useStorytellerStore.getState().game!.players[p1]!;
    expect(player.privateInfo).toBeUndefined();
  });

  it("setFakeMinions writes valid players, skips self/unknown", () => {
    const { p1, p2, p3 } = setupTBGame();
    useStorytellerStore.getState().setFakeMinions(p1, [p2, p3, p1, "ghost"]);
    const player = useStorytellerStore.getState().game!.players[p1]!;
    expect(player.privateInfo?.fakeMinions).toEqual([p2, p3]);
  });

  it("assignRole clears bluffs and fakeMinions (deception state cleanup)", () => {
    const { p1, p2 } = setupTBGame();
    useStorytellerStore.getState().assignRole(p1, "imp");
    useStorytellerStore.getState().setBluffs(p1, ["chef", "saint", "virgin"]);
    useStorytellerStore.getState().setFakeMinions(p1, [p2]);
    expect(
      useStorytellerStore.getState().game!.players[p1]!.privateInfo
    ).toBeDefined();
    useStorytellerStore.getState().assignRole(p1, "saint");
    const after = useStorytellerStore.getState().game!.players[p1]!;
    expect(after.privateInfo).toBeUndefined();
    expect(after.behaviorMode).toBe("normal");
    expect(after.shownRole).toBeNull();
  });

  it("removePlayer scrubs dangling fakeMinion references on remaining seats", () => {
    const { p1, p2, p3 } = setupTBGame();
    useStorytellerStore.getState().setFakeMinions(p1, [p2, p3]);
    useStorytellerStore.getState().removePlayer(p2);
    const lunatic = useStorytellerStore.getState().game!.players[p1]!;
    expect(lunatic.privateInfo?.fakeMinions).toEqual([p3]);
  });

  it("setBluffs preserves an existing fakeMinions entry", () => {
    const { p1, p2 } = setupTBGame();
    useStorytellerStore.getState().setFakeMinions(p1, [p2]);
    useStorytellerStore.getState().setBluffs(p1, ["chef"]);
    const player = useStorytellerStore.getState().game!.players[p1]!;
    expect(player.privateInfo?.fakeMinions).toEqual([p2]);
    expect(player.privateInfo?.bluffs).toEqual(["chef"]);
  });
});
