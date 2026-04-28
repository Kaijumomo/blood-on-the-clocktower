import { describe, it, expect } from "vitest";
import { SETUP_COUNTS, MIN_PLAYERS, MAX_PLAYERS } from "./setupCounts";

describe("SETUP_COUNTS", () => {
  it("is defined for every integer from MIN_PLAYERS to MAX_PLAYERS", () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      expect(SETUP_COUNTS[n], `missing entry for ${n} players`).toBeDefined();
    }
  });

  it("sum of all role counts equals the player count for every entry", () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const c = SETUP_COUNTS[n];
      const sum = c.townsfolk + c.outsider + c.minion + c.demon;
      expect(sum, `counts for ${n} players sum to ${sum}, expected ${n}`).toBe(n);
    }
  });

  it("always has exactly 1 demon", () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      expect(SETUP_COUNTS[n].demon, `${n} players should have 1 demon`).toBe(1);
    }
  });
});
