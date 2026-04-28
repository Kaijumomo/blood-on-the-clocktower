import { lookupOfficialRole } from "@/data/officialRoles";
import type { PublicLobbyRecord } from "@/stores/types";

export type ActiveFabled = { id: string; name: string; ability: string };

// Resolves the public lobby's fabled IDs to {id, name, ability} entries
// using the same role lookup that covers travelers + fabled.
export function selectActiveFabled(publicLobby: PublicLobbyRecord): ActiveFabled[] {
  return publicLobby.fabled
    .map((id) => {
      const r = lookupOfficialRole(id);
      if (!r) return null;
      return { id: r.id, name: r.name, ability: typeof r.ability === "string" ? r.ability : "" };
    })
    .filter((x): x is ActiveFabled => x !== null);
}

export const PHASE_LABEL: Record<string, string> = {
  setup: "Setup",
  night: "Night",
  day: "Day",
  ended: "Ended",
};
