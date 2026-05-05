// Official Loric roster from Blood on the Clocktower.
// Lorics are Storyteller-controlled modifiers, not seated players:
//   - No seat, no token in the ring.
//   - Cannot die. Do not lose abilities.
//   - Selected at setup; may be added/removed mid-game.
//   - Surfaced as persistent reminders to the ST.
//   - Visible on the public display so players know which are active.
//
// Token images: https://release.botc.app/resources/characters/loric/{id}.webp

import type { RoleDef, RoleId } from "@/stores/types";

export const LORICS: RoleDef[] = [
  {
    id: "bigwig",
    name: "Big Wig",
    type: "loric",
    edition: "loric",
    ability:
      "The Storyteller has a second token that can be placed on any player. That player counts as having an extra ability on top of their own.",
    flavor: '"Everyone defers to the Big Wig."',
  },
  {
    id: "bootlegger",
    name: "Bootlegger",
    type: "loric",
    edition: "loric",
    ability:
      "At the start of the game, the Storyteller secretly alters one rule of the game. All players are told what that rule is.",
    flavor: '"The rules, like everything else, are negotiable."',
  },
  {
    id: "gardener",
    name: "Gardener",
    type: "loric",
    edition: "loric",
    ability:
      "The Storyteller may choose which player receives each role, rather than dealing them randomly.",
    flavor: '"Every seed planted with purpose."',
  },
  {
    id: "godofug",
    name: "God of Ug",
    type: "loric",
    edition: "loric",
    ability:
      "One Ug hat. When wearing the Ug hat, a player must speak one sound at a time but may vote twice. If they fail, pass the Ug hat.",
    flavor: '"Ug smash. Ug vote twice."',
  },
  {
    id: "hindu",
    name: "Hindu",
    type: "loric",
    edition: "loric",
    ability:
      "Players may not say the names of characters in play. If they do, they may not vote tomorrow.",
    flavor: '"Some names carry too much power."',
  },
  {
    id: "knaves",
    name: "Knaves",
    type: "loric",
    edition: "loric",
    ability:
      "There are 2 Storytellers: one lies and one tells the truth. Once per game, at dusk, they might switch.",
    flavor: '"Two voices. One truth. One lie."',
  },
  {
    id: "pope",
    name: "Pope",
    type: "loric",
    edition: "loric",
    ability: "Once per game, the Pope may declare a holy day. No execution occurs that day.",
    flavor: '"His word was law. At least for one day."',
  },
  {
    id: "stormcatcher",
    name: "Storm Catcher",
    type: "loric",
    edition: "loric",
    ability: "The first time a player would die each night, they do not. The Storyteller catches the storm.",
    flavor: '"She stood between the town and the dark."',
  },
  {
    id: "tor",
    name: "Tor",
    type: "loric",
    edition: "loric",
    ability:
      "All players must use only one hand to gesture. If they use two hands, the Storyteller may give them false information.",
    flavor: '"One hand. One truth. Two hands, and the stones remember."',
  },
  {
    id: "ventriloquist",
    name: "Ventriloquist",
    type: "loric",
    edition: "loric",
    ability:
      "Each day, the Storyteller privately tells one player something as if they were another character.",
    flavor: '"The voice came from the puppet. Or so they thought."',
  },
  {
    id: "zenomancer",
    name: "Zenomancer",
    type: "loric",
    edition: "loric",
    ability:
      "Each night, the Storyteller may point at any number of players: they swap seats with a neighbor.",
    flavor: '"The circle is never quite the same twice."',
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
