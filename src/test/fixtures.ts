import type { RoleDef, STPlayerRecord, Script } from "@/stores/types";

export const roles: Record<string, RoleDef> = {
  chef: { id: "chef", name: "Chef", type: "townsfolk", firstNight: 30 },
  washerwoman: {
    id: "washerwoman",
    name: "Washerwoman",
    type: "townsfolk",
    firstNight: 20,
  },
  drunk: { id: "drunk", name: "Drunk", type: "outsider" },
  saint: { id: "saint", name: "Saint", type: "outsider" },
  marionette: { id: "marionette", name: "Marionette", type: "minion" },
  baron: { id: "baron", name: "Baron", type: "minion" },
  imp: { id: "imp", name: "Imp", type: "demon", otherNight: 20 },
  lunatic: { id: "lunatic", name: "Lunatic", type: "outsider" },
  scarletwoman: { id: "scarletwoman", name: "Scarlet Woman", type: "minion" },
  poisoner: { id: "poisoner", name: "Poisoner", type: "minion", firstNight: 10 },
};

export const tbScript: Script = {
  id: "tb",
  name: "Trouble Brewing",
  characters: [
    roles.chef!,
    roles.washerwoman!,
    roles.drunk!,
    roles.saint!,
    roles.baron!,
    roles.poisoner!,
    roles.scarletwoman!,
    roles.imp!,
    roles.lunatic!,
    roles.marionette!,
  ],
};

export function makeSTPlayer(over: Partial<STPlayerRecord> = {}): STPlayerRecord {
  return {
    id: "p1",
    name: "Alice",
    seat: 0,
    joinedAt: 1_700_000_000_000,
    actualRole: "chef",
    shownRole: null,
    shownAlignment: null,
    behaviorMode: "normal",
    publicDisplayRole: null,
    alive: true,
    ghostVote: true,
    abilityUsed: false,
    statuses: {},
    reminders: [],
    stNotes: "",
    isTraveler: false,
    ...over,
  };
}
