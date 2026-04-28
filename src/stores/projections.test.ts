import { describe, expect, it } from "vitest";
import { buildRegistry } from "@/data/roleRegistry";
import { makeSTPlayer, tbScript } from "@/test/fixtures";
import {
  projectLobbyToPublic,
  projectLobbyToSelfMap,
  projectToPublic,
  projectToSelf,
} from "./projections";
import type { StorytellerLobbyRecord } from "./types";

const registry = buildRegistry(tbScript);

const PRIVATE_FIELDS = [
  "actualRole",
  "shownRole",
  "shownAlignment",
  "behaviorMode",
  "privateInfo",
  "statuses",
  "reminders",
  "stNotes",
  "abilityUsed",
] as const;

describe("projectToSelf — Drunk", () => {
  it("Drunk Chef projects shownRole=chef, shownAlignment=good", () => {
    const drunk = makeSTPlayer({
      id: "p1",
      actualRole: "drunk",
      shownRole: "chef",
      shownAlignment: null,
      behaviorMode: "drunk_fake_role_behavior",
    });
    const self = projectToSelf(drunk, registry);
    expect(self.shownRole).toBe("chef");
    expect(self.shownAlignment).toBe("good");
    expect(self.bluffs).toBeUndefined();
    expect(self.fakeMinions).toBeUndefined();
    // Critical: actualRole never appears in self projection
    expect(JSON.stringify(self)).not.toContain("drunk");
    expect(JSON.stringify(self)).not.toContain("actualRole");
  });
});

describe("projectToSelf — Lunatic", () => {
  it("Lunatic projects shownRole=imp, shownAlignment=evil, fake bluffs", () => {
    const lunatic = makeSTPlayer({
      id: "p2",
      name: "Bob",
      actualRole: "lunatic",
      shownRole: "imp",
      shownAlignment: null,
      behaviorMode: "fake_demon_behavior",
      privateInfo: {
        bluffs: ["chef", "washerwoman", "saint"],
        fakeMinions: ["p3", "p4"],
      },
    });
    const self = projectToSelf(lunatic, registry);
    expect(self.shownRole).toBe("imp");
    expect(self.shownAlignment).toBe("evil");
    expect(self.bluffs).toEqual(["chef", "washerwoman", "saint"]);
    expect(self.fakeMinions).toEqual(["p3", "p4"]);
    expect(JSON.stringify(self)).not.toContain("lunatic");
  });
});

describe("projectToSelf — Marionette", () => {
  it("Marionette projects shownRole=townsfolk, shownAlignment=good", () => {
    const marion = makeSTPlayer({
      id: "p3",
      actualRole: "marionette",
      shownRole: "washerwoman",
      shownAlignment: null,
      behaviorMode: "marionette_fake_good_behavior",
    });
    const self = projectToSelf(marion, registry);
    expect(self.shownRole).toBe("washerwoman");
    expect(self.shownAlignment).toBe("good");
    expect(JSON.stringify(self)).not.toContain("marionette");
  });
});

describe("projectToSelf — normal", () => {
  it("Normal player projects actualRole as shownRole when no deception", () => {
    const p = makeSTPlayer({ actualRole: "chef" });
    const self = projectToSelf(p, registry);
    expect(self.shownRole).toBe("chef");
    expect(self.shownAlignment).toBe("good");
  });

  it("Real Demon's bluffs (real ones) project via privateInfo", () => {
    const imp = makeSTPlayer({
      actualRole: "imp",
      privateInfo: { bluffs: ["chef", "washerwoman", "saint"] },
    });
    const self = projectToSelf(imp, registry);
    expect(self.bluffs).toEqual(["chef", "washerwoman", "saint"]);
    expect(self.shownRole).toBe("imp");
    expect(self.shownAlignment).toBe("evil");
  });
});

describe("projectToSelf — explicit shownAlignment override", () => {
  it("respects explicit shownAlignment over derivation", () => {
    const p = makeSTPlayer({
      actualRole: "chef",
      shownRole: "chef",
      shownAlignment: "evil", // weird ST override; trust it
    });
    const self = projectToSelf(p, registry);
    expect(self.shownAlignment).toBe("evil");
  });
});

describe("projectToSelf — clearing deception", () => {
  it("removing shownRole reverts to actualRole", () => {
    const p = makeSTPlayer({
      actualRole: "drunk",
      shownRole: "chef",
      shownAlignment: null,
      behaviorMode: "drunk_fake_role_behavior",
    });
    const cleaned = { ...p, shownRole: null, behaviorMode: "normal" as const };
    const self = projectToSelf(cleaned, registry);
    expect(self.shownRole).toBe("drunk");
    expect(self.shownAlignment).toBe("good");
  });
});

describe("projectToPublic", () => {
  it("strips all role/alignment/private fields", () => {
    const p = makeSTPlayer({
      actualRole: "lunatic",
      shownRole: "imp",
      shownAlignment: null,
      behaviorMode: "fake_demon_behavior",
      privateInfo: { bluffs: ["chef"], fakeMinions: ["p2"] },
      reminders: ["secret"],
      stNotes: "do not leak",
      statuses: { drunk: true },
      abilityUsed: true,
    });
    const pub = projectToPublic(p, true);
    const json = JSON.stringify(pub);
    for (const f of PRIVATE_FIELDS) {
      expect(json).not.toContain(`"${f}"`);
    }
    expect(json).not.toContain("lunatic");
    expect(json).not.toContain("imp");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("do not leak");
    expect(pub.alive).toBe(true);
    expect(pub.online).toBe(true);
    expect(pub.name).toBe("Alice");
  });

  it("includes publicDisplayRole only when set", () => {
    const a = projectToPublic(makeSTPlayer({ publicDisplayRole: null }), false);
    expect(a.publicDisplayRole).toBeUndefined();
    const b = projectToPublic(
      makeSTPlayer({ publicDisplayRole: "saint" }),
      false
    );
    expect(b.publicDisplayRole).toBe("saint");
  });
});

describe("Lobby-level projections", () => {
  function makeLobby(): StorytellerLobbyRecord {
    return {
      code: "ABCD12",
      storytellerUid: "uid-st",
      scriptId: "tb",
      phase: "night",
      day: 1,
      bluffs: ["chef", "washerwoman", "saint"],
      fabled: [],
      notes: "ST-only",
      seatOrder: ["p1", "p2", "p3"],
      players: {
        p1: makeSTPlayer({
          id: "p1",
          actualRole: "imp",
          privateInfo: { bluffs: ["chef", "washerwoman", "saint"] },
        }),
        p2: makeSTPlayer({
          id: "p2",
          name: "Bob",
          seat: 1,
          actualRole: "lunatic",
          shownRole: "imp",
          shownAlignment: null,
          behaviorMode: "fake_demon_behavior",
          privateInfo: { bluffs: ["poisoner", "baron", "scarletwoman"] },
        }),
        p3: makeSTPlayer({
          id: "p3",
          name: "Cara",
          seat: 2,
          actualRole: "drunk",
          shownRole: "chef",
          shownAlignment: null,
          behaviorMode: "drunk_fake_role_behavior",
        }),
      },
    };
  }

  it("public lobby never contains role/alignment for any player", () => {
    const lobby = makeLobby();
    const pub = projectLobbyToPublic(lobby, { p1: true, p2: true, p3: false });
    const json = JSON.stringify(pub);
    expect(json).not.toContain("imp");
    expect(json).not.toContain("lunatic");
    expect(json).not.toContain("drunk");
    expect(json).not.toContain("chef");
    expect(json).not.toContain("ST-only");
    expect(json).not.toContain("storytellerUid");
    expect(json).not.toContain("bluffs");
    expect(json).not.toContain("notes");
    for (const f of PRIVATE_FIELDS) {
      expect(json).not.toContain(`"${f}"`);
    }
    expect(pub.players.p1!.online).toBe(true);
    expect(pub.players.p3!.online).toBe(false);
  });

  it("self-map projection: each player only contains their own self record", () => {
    const lobby = makeLobby();
    const selves = projectLobbyToSelfMap(lobby, registry);
    // p1 (Imp) sees real bluffs
    expect(selves.p1!.bluffs).toEqual(["chef", "washerwoman", "saint"]);
    expect(selves.p1!.shownRole).toBe("imp");
    // p2 (Lunatic) sees fake bluffs, never the real demon's bluffs
    expect(selves.p2!.bluffs).toEqual(["poisoner", "baron", "scarletwoman"]);
    expect(selves.p2!.shownRole).toBe("imp");
    expect(selves.p2!.shownAlignment).toBe("evil");
    // p3 (Drunk) sees Chef, no bluffs
    expect(selves.p3!.shownRole).toBe("chef");
    expect(selves.p3!.shownAlignment).toBe("good");
    expect(selves.p3!.bluffs).toBeUndefined();
  });
});
