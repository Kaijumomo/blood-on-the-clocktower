import type { Script } from "@/stores/types";

export const troubleBrewing: Script = {
  id: "tb",
  name: "Trouble Brewing",
  characters: [
    { id: "washerwoman", name: "Washerwoman", type: "townsfolk", edition: "tb", firstNight: 33, ability: "You start knowing 1 of 2 players is a particular Townsfolk." },
    { id: "librarian", name: "Librarian", type: "townsfolk", edition: "tb", firstNight: 34, ability: "You start knowing 1 of 2 players is a particular Outsider. (Or that zero are in play.)" },
    { id: "investigator", name: "Investigator", type: "townsfolk", edition: "tb", firstNight: 35, ability: "You start knowing 1 of 2 players is a particular Minion." },
    { id: "chef", name: "Chef", type: "townsfolk", edition: "tb", firstNight: 36, ability: "You start knowing how many pairs of evil players there are." },
    { id: "empath", name: "Empath", type: "townsfolk", edition: "tb", firstNight: 37, otherNight: 53, ability: "Each night, you learn how many of your 2 alive neighbors are evil." },
    { id: "fortuneteller", name: "Fortune Teller", type: "townsfolk", edition: "tb", firstNight: 38, otherNight: 54, ability: "Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you." },
    { id: "undertaker", name: "Undertaker", type: "townsfolk", edition: "tb", otherNight: 55, ability: "Each night except the first, you learn which character died by execution today." },
    { id: "monk", name: "Monk", type: "townsfolk", edition: "tb", otherNight: 12, ability: "Each night except the first, choose a player (not yourself): they are safe from the Demon tonight." },
    { id: "ravenkeeper", name: "Ravenkeeper", type: "townsfolk", edition: "tb", otherNight: 39, ability: "If you die at night, you are woken to choose a player: you learn their character." },
    { id: "virgin", name: "Virgin", type: "townsfolk", edition: "tb", oncePerGame: true, ability: "The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately." },
    { id: "slayer", name: "Slayer", type: "townsfolk", edition: "tb", oncePerGame: true, ability: "Once per game, during the day, publicly choose a player: if they are the Demon, they die." },
    { id: "soldier", name: "Soldier", type: "townsfolk", edition: "tb", ability: "You are safe from the Demon." },
    { id: "mayor", name: "Mayor", type: "townsfolk", edition: "tb", ability: "If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead." },

    { id: "butler", name: "Butler", type: "outsider", edition: "tb", otherNight: 56, ability: "Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too." },
    { id: "drunk", name: "Drunk", type: "outsider", edition: "tb", ability: "You do not know you are the Drunk. You think you are a Townsfolk character, but you are not." },
    { id: "recluse", name: "Recluse", type: "outsider", edition: "tb", ability: "You might register as evil & as a Minion or Demon, even if dead." },
    { id: "saint", name: "Saint", type: "outsider", edition: "tb", ability: "If you die by execution, your team loses." },

    { id: "poisoner", name: "Poisoner", type: "minion", edition: "tb", firstNight: 17, otherNight: 8, ability: "Each night, choose a player: they are poisoned tonight and tomorrow day." },
    { id: "spy", name: "Spy", type: "minion", edition: "tb", firstNight: 49, otherNight: 68, ability: "Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead." },
    { id: "scarletwoman", name: "Scarlet Woman", type: "minion", edition: "tb", otherNight: 19, ability: "If there are 5 or more players alive & the Demon dies, you become the Demon." },
    { id: "baron", name: "Baron", type: "minion", edition: "tb", setup: true, ability: "There are extra Outsiders in play. [+2 Outsiders]" },

    { id: "imp", name: "Imp", type: "demon", edition: "tb", otherNight: 24, ability: "Each night except the first, choose a player: they die. If you choose yourself, you die & a Minion becomes the Imp." },
  ],
};
