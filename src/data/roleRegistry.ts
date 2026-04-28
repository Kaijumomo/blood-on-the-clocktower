import type { Alignment, RoleDef, RoleId, Script } from "@/stores/types";
import { TRAVELERS } from "@/data/travelers";

export type RoleRegistry = {
  get: (id: RoleId) => RoleDef | undefined;
  alignmentOf: (id: RoleId) => Alignment;
};

export function deriveAlignment(role: RoleDef): Alignment {
  if (role.alignment) return role.alignment;
  switch (role.type) {
    case "townsfolk":
    case "outsider":
      return "good";
    case "minion":
    case "demon":
      return "evil";
    case "traveler":
    case "fabled":
      return "good";
  }
}

export function buildRegistry(script: Script): RoleRegistry {
  const map = new Map<RoleId, RoleDef>();
  for (const r of script.characters) map.set(r.id, r);
  if (script.fabled) for (const r of script.fabled) map.set(r.id, r);
  for (const r of TRAVELERS) map.set(r.id, r);
  return {
    get: (id) => map.get(id),
    alignmentOf: (id) => {
      const r = map.get(id);
      if (!r) {
        throw new Error(`Unknown role id: ${id}`);
      }
      return deriveAlignment(r);
    },
  };
}
