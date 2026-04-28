import { describe, expect, it } from "vitest";
import { parseClocktowerScript } from "./customScript";

describe("parseClocktowerScript — top-level shape", () => {
  it("rejects a non-array input", () => {
    const r = parseClocktowerScript("not an array");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/array/i);
  });

  it("rejects an empty array", () => {
    const r = parseClocktowerScript([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least one character/i);
  });

  it("rejects a meta-only array", () => {
    const r = parseClocktowerScript([{ id: "_meta", name: "X" }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least one character/i);
  });
});

describe("parseClocktowerScript — string id references", () => {
  it("resolves an exact-match official role id", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "Tiny" },
      "washerwoman",
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.script.characters).toHaveLength(1);
      expect(r.script.characters[0]!.id).toBe("washerwoman");
      expect(r.script.characters[0]!.type).toBe("townsfolk");
    }
  });

  it("normalizes dashed/underscored ids during lookup", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "Tiny" },
      "snake-charmer",
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.script.characters[0]!.id).toBe("snakecharmer");
  });

  it("rejects an unknown official role id with usable error", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "Bad" },
      "nonexistent",
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/Unknown official role id/i);
      expect(r.error).toMatch(/nonexistent/);
    }
  });
});

describe("parseClocktowerScript — homebrew character objects", () => {
  it("renames `team` to `type`", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "HB" },
      { id: "homebrew", name: "Q", team: "townsfolk", ability: "x" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.script.characters[0]!.type).toBe("townsfolk");
      // The `team` key should be gone after normalization
      expect((r.script.characters[0] as Record<string, unknown>).team).toBeUndefined();
    }
  });

  it("preserves unknown homebrew fields via .passthrough()", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "HB" },
      {
        id: "homebrew",
        name: "Q",
        team: "townsfolk",
        customField: "preserve me",
        art: { svg: "<svg/>" },
      },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const c = r.script.characters[0] as Record<string, unknown>;
      expect(c.customField).toBe("preserve me");
      expect(c.art).toEqual({ svg: "<svg/>" });
    }
  });

  it("accepts `description` as an alias for `ability`", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "HB" },
      { id: "homebrew", name: "Q", team: "townsfolk", description: "alt-ability" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.script.characters[0]!.ability).toBe("alt-ability");
  });

  it("normalizes the British spelling 'traveller' to 'traveler'", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "HB" },
      { id: "homebrew", name: "Q", team: "traveller", ability: "x" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.script.characters[0]!.type).toBe("traveler");
  });

  it("rejects a character missing id with index in error", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "Bad" },
      { name: "NoId", team: "townsfolk" },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/index 1/);
      expect(r.error).toMatch(/id/);
    }
  });

  it("rejects a character with an invalid type", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "Bad" },
      { id: "q", name: "Q", type: "wizard" },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/type/);
  });
});

describe("parseClocktowerScript — meta extraction", () => {
  it("uses the name from _meta", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "My Cool Script" },
      "imp",
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.script.name).toBe("My Cool Script");
      expect(r.script.id).toMatch(/^my-cool-script$/);
    }
  });

  it("captures author when present", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "X", author: "Jane" },
      "imp",
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.script.author).toBe("Jane");
  });

  it("falls back to a unique id when no meta is given", () => {
    const r = parseClocktowerScript(["imp"]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.script.name).toBe("Custom script");
      expect(r.script.id).toMatch(/^custom-/);
    }
  });
});

describe("parseClocktowerScript — mixed script", () => {
  it("accepts a mix of official ids and homebrew objects", () => {
    const r = parseClocktowerScript([
      { id: "_meta", name: "Mixed" },
      "washerwoman",
      "imp",
      { id: "newrole", name: "New Role", team: "outsider", ability: "x" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.script.characters).toHaveLength(3);
      expect(r.script.characters.map((c) => c.id)).toEqual([
        "washerwoman",
        "imp",
        "newrole",
      ]);
    }
  });
});
