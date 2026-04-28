import { describe, expect, it } from "vitest";
import { TRAVELERS } from "@/data/travelers";
import { tbScript } from "@/test/fixtures";
import { buildRoleDisplayMap } from "./GrimoireCircle";

describe("buildRoleDisplayMap — ST grimoire token role lookup", () => {
  it("resolves 'thief' traveler role", () => {
    const map = buildRoleDisplayMap(tbScript);
    const role = map.get("thief");
    expect(role).toBeDefined();
    expect(role!.name).toBe("Thief");
    expect(role!.type).toBe("traveler");
  });

  it("resolves every Traveler role id", () => {
    const map = buildRoleDisplayMap(tbScript);
    for (const t of TRAVELERS) {
      expect(map.get(t.id), `traveler "${t.id}" missing from display map`).toBeDefined();
    }
  });

  it("normal script roles still resolve", () => {
    const map = buildRoleDisplayMap(tbScript);
    expect(map.get("imp")).toBeDefined();
    expect(map.get("imp")!.name).toBe("Imp");
    expect(map.get("chef")).toBeDefined();
  });

  it("empty actualRole returns undefined (token shows unassigned)", () => {
    const map = buildRoleDisplayMap(tbScript);
    expect(map.get("")).toBeUndefined();
    expect(map.get(undefined as unknown as string)).toBeUndefined();
  });
});
