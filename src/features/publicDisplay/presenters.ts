import { lookupOfficialRole } from "@/data/officialRoles";
import type { PublicLobbyRecord } from "@/stores/types";

export type ActiveRole = { id: string; name: string; ability: string };

function resolveIds(ids: string[]): ActiveRole[] {
  return ids
    .map((id) => {
      const r = lookupOfficialRole(id);
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        ability: typeof r.ability === "string" ? r.ability : "",
      };
    })
    .filter((x): x is ActiveRole => x !== null);
}

// Resolves the public lobby's fabled IDs to {id, name, ability} entries
// using the same role lookup that covers travelers + fabled.
export function selectActiveFabled(publicLobby: PublicLobbyRecord): ActiveRole[] {
  return resolveIds(publicLobby.fabled);
}

export function selectActiveLorics(publicLobby: PublicLobbyRecord): ActiveRole[] {
  return resolveIds(publicLobby.lorics ?? []);
}

// Backwards-compat alias for older callers that imported the original name.
export type ActiveFabled = ActiveRole;

export const PHASE_LABEL: Record<string, string> = {
  setup: "Setup",
  night: "Night",
  day: "Day",
  ended: "Ended",
};
