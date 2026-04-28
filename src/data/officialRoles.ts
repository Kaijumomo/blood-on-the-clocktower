import type { RoleDef } from "@/stores/types";
import { BUILTIN_SCRIPTS } from "./scripts";
import { TRAVELERS } from "./travelers";
import { FABLED } from "./fabled";

const normalize = (id: string): string =>
  id.toLowerCase().replace(/[^a-z0-9]/g, "");

const allOfficial: RoleDef[] = [
  ...Object.values(BUILTIN_SCRIPTS).flatMap((s) => s.characters),
  ...TRAVELERS,
  ...FABLED,
];

const byNormalized = new Map<string, RoleDef>();
for (const r of allOfficial) byNormalized.set(normalize(r.id), r);

export function lookupOfficialRole(id: string): RoleDef | undefined {
  return byNormalized.get(normalize(id));
}

export function listOfficialRoles(): RoleDef[] {
  return allOfficial;
}
