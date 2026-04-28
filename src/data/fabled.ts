import type { RoleDef, RoleId } from "@/stores/types";

export const FABLED: RoleDef[] = [
  { id: "angel", name: "Angel", type: "fabled", ability: "Something bad might happen to whoever is most responsible for the death of a new player." },
  { id: "buddhist", name: "Buddhist", type: "fabled", ability: "For the 1st 2 minutes of each day, veteran players may not talk." },
  { id: "doomsayer", name: "Doomsayer", type: "fabled", ability: "If 4 or more players live, each player may publicly choose (once per game) that a player of their own alignment dies." },
  { id: "hellslibrarian", name: "Hells Librarian", type: "fabled", ability: "Something bad might happen to whoever talks when the Storyteller has asked for silence." },
  { id: "fiddler", name: "Fiddler", type: "fabled", ability: "Once per game, the Demon secretly chooses an opposing living player: all players choose which of these 2 win." },
  { id: "revolutionary", name: "Revolutionary", type: "fabled", ability: "2 neighbouring players are known to be the same alignment. Once per game, 1 of them registers falsely." },
  { id: "toymaker", name: "Toymaker", type: "fabled", ability: "The Demon may choose not to attack & must do this at least once per game. Evil wins if 28 days pass." },
  { id: "djinn", name: "Djinn", type: "fabled", ability: "Use the Djinn's special rule. All players know what it is." },
  { id: "duchess", name: "Duchess", type: "fabled", ability: "Each day, 3 players you choose may visit you. At night*, each visitor learns how many other visitors are evil, but 1 gets false info." },
  { id: "fibbin", name: "Fibbin", type: "fabled", ability: "Once per game, 1 good player might get false information." },
  { id: "sentinel", name: "Sentinel", type: "fabled", ability: "There might be 1 extra or 1 fewer Outsider in play." },
  { id: "spiritofivory", name: "Spirit of Ivory", type: "fabled", ability: "There can't be more than 1 extra evil player." },
];

const byId = new Map<RoleId, RoleDef>();
for (const r of FABLED) byId.set(r.id, r);

export function getFabled(id: RoleId): RoleDef | undefined {
  return byId.get(id);
}

export function listFabled(): RoleDef[] {
  return FABLED;
}
