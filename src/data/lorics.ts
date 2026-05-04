// Lorics are a Storyteller-controlled character category that sit alongside
// Fabled but follow different rules:
//   - Not players. They have no seat, no token in the ring.
//   - Cannot die. Do not lose abilities. No normal-player state machine.
//   - Selected at setup (and may be added/removed mid-game).
//   - Surfaced to the ST as persistent reminders.
//   - Visible on the public display so players know which Lorics are active.
//
// The list below is the starting roster — extend or replace by editing this
// file. Entries follow the same RoleDef shape as Fabled so the Almanac and
// public renderers can show them without special casing.

import type { RoleDef, RoleId } from "@/stores/types";

export const LORICS: RoleDef[] = [
  {
    id: "lor_oakheart",
    name: "Oakheart",
    type: "loric",
    ability:
      "The town's old oak watches the proceedings. The Storyteller may, once per day, hint at a player's alignment through a small omen.",
    flavor: '"The roots remember everything the leaves forget."',
  },
  {
    id: "lor_ravenherald",
    name: "Raven Herald",
    type: "loric",
    ability:
      "A messenger of the dead. Each night, the Storyteller may reveal one dead player's character to all living players.",
    flavor: '"The dead are not silent — only patient."',
  },
  {
    id: "lor_lanternwatch",
    name: "Lantern Watch",
    type: "loric",
    ability:
      "While Lantern Watch is active, the town has soft light. The Storyteller may pause the day at will to remind players of the time.",
    flavor: '"A lantern in the fog is a promise that someone is awake."',
  },
  {
    id: "lor_riverwarden",
    name: "River Warden",
    type: "loric",
    ability:
      "The river marks the town's edge. The Storyteller may, once per game, declare a public truce in which no nominations may occur for one day.",
    flavor: '"Still water keeps its own counsel."',
  },
  {
    id: "lor_chronicler",
    name: "Chronicler",
    type: "loric",
    ability:
      "The town's record-keeper. The Storyteller maintains a public list of the day's executions and the deaths each night.",
    flavor: '"What is written cannot be unsaid."',
  },
];

const byId = new Map<RoleId, RoleDef>();
for (const r of LORICS) byId.set(r.id, r);

export function getLoric(id: RoleId): RoleDef | undefined {
  return byId.get(id);
}

export function listLorics(): RoleDef[] {
  return LORICS;
}
