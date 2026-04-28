import type { Script } from "@/stores/types";

export const sectsAndViolets: Script = {
  id: "snv",
  name: "Sects & Violets",
  characters: [
    { id: "clockmaker", name: "Clockmaker", type: "townsfolk", edition: "snv", firstNight: 24, ability: "You start knowing how many steps from the Demon to its nearest Minion." },
    { id: "dreamer", name: "Dreamer", type: "townsfolk", edition: "snv", firstNight: 25, otherNight: 34, ability: "Each night, choose a player (not yourself or Travellers): you learn 1 good & 1 evil character, 1 of which is correct." },
    { id: "snakecharmer", name: "Snake Charmer", type: "townsfolk", edition: "snv", firstNight: 27, otherNight: 19, ability: "Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned." },
    { id: "mathematician", name: "Mathematician", type: "townsfolk", edition: "snv", firstNight: 26, otherNight: 35, ability: "Each night, you learn how many players' abilities worked abnormally (since dawn) due to another character's ability." },
    { id: "flowergirl", name: "Flowergirl", type: "townsfolk", edition: "snv", otherNight: 39, ability: "Each night*, you learn if a Demon voted today." },
    { id: "towncrier", name: "Town Crier", type: "townsfolk", edition: "snv", otherNight: 38, ability: "Each night*, you learn if a Minion nominated today." },
    { id: "oracle", name: "Oracle", type: "townsfolk", edition: "snv", otherNight: 40, ability: "Each night*, you learn how many dead players are evil." },
    { id: "savant", name: "Savant", type: "townsfolk", edition: "snv", ability: "Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false." },
    { id: "seamstress", name: "Seamstress", type: "townsfolk", edition: "snv", otherNight: 36, oncePerGame: true, ability: "Once per game, at night, choose 2 players (not yourself): you learn if they are the same alignment." },
    { id: "philosopher", name: "Philosopher", type: "townsfolk", edition: "snv", firstNight: 15, otherNight: 14, oncePerGame: true, ability: "Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk." },
    { id: "artist", name: "Artist", type: "townsfolk", edition: "snv", oncePerGame: true, ability: "Once per game, during the day, privately ask the Storyteller any yes/no question." },
    { id: "juggler", name: "Juggler", type: "townsfolk", edition: "snv", otherNight: 37, ability: "On your 1st day, publicly guess up to 5 players' characters. That night, you learn how many you got correct." },
    { id: "sage", name: "Sage", type: "townsfolk", edition: "snv", otherNight: 41, ability: "If the Demon kills you, you learn that it is 1 of 2 players." },

    { id: "mutant", name: "Mutant", type: "outsider", edition: "snv", ability: "If you are 'mad' about being an Outsider, you might be executed." },
    { id: "sweetheart", name: "Sweetheart", type: "outsider", edition: "snv", otherNight: 30, ability: "When you die, 1 player is drunk from now on." },
    { id: "barber", name: "Barber", type: "outsider", edition: "snv", otherNight: 28, ability: "If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters." },
    { id: "klutz", name: "Klutz", type: "outsider", edition: "snv", ability: "When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses." },

    { id: "eviltwin", name: "Evil Twin", type: "minion", edition: "snv", firstNight: 5, otherNight: 4, ability: "You & an opposing player know each other. If the good player is executed, evil wins. Good can't win if you both live." },
    { id: "witch", name: "Witch", type: "minion", edition: "snv", firstNight: 6, otherNight: 11, ability: "Each night, choose a player: if they nominate tomorrow, they die. If just 3 players live, you lose this ability." },
    { id: "cerenovus", name: "Cerenovus", type: "minion", edition: "snv", firstNight: 7, otherNight: 12, ability: "Each night, choose a player & a good character: they are 'mad' they are this character tomorrow, or might be executed." },
    { id: "pithag", name: "Pit-Hag", type: "minion", edition: "snv", otherNight: 13, ability: "Each night*, choose a player & a character they become (if not in play). If a Demon is made, deaths tonight are arbitrary." },

    { id: "fanggu", name: "Fang Gu", type: "demon", edition: "snv", otherNight: 15, setup: true, ability: "Each night*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. [+1 Outsider]" },
    { id: "vigormortis", name: "Vigormortis", type: "demon", edition: "snv", otherNight: 16, setup: true, ability: "Each night*, choose a player: they die. Minions you kill keep their ability & poison 1 Townsfolk neighbour. [-1 Outsider]" },
    { id: "nodashii", name: "No Dashii", type: "demon", edition: "snv", otherNight: 17, ability: "Each night*, choose a player: they die. Your 2 Townsfolk neighbours are poisoned." },
    { id: "vortox", name: "Vortox", type: "demon", edition: "snv", otherNight: 18, ability: "Each night*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins." },
  ],
};
