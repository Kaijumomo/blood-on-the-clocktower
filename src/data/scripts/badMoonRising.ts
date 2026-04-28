import type { Script } from "@/stores/types";

export const badMoonRising: Script = {
  id: "bmr",
  name: "Bad Moon Rising",
  characters: [
    { id: "grandmother", name: "Grandmother", type: "townsfolk", edition: "bmr", firstNight: 30, otherNight: 49, ability: "You start knowing a good player & their character. If the Demon kills them, you die too." },
    { id: "sailor", name: "Sailor", type: "townsfolk", edition: "bmr", firstNight: 31, otherNight: 50, ability: "Each night, choose an alive player: either you or they are drunk until dusk. You can't die." },
    { id: "chambermaid", name: "Chambermaid", type: "townsfolk", edition: "bmr", firstNight: 32, otherNight: 51, ability: "Each night, choose 2 alive players (not yourself): you learn how many woke tonight due to their ability." },
    { id: "exorcist", name: "Exorcist", type: "townsfolk", edition: "bmr", otherNight: 20, ability: "Each night*, choose a player (different to last night): the Demon, if chosen, learns who you are then doesn't wake tonight." },
    { id: "innkeeper", name: "Innkeeper", type: "townsfolk", edition: "bmr", otherNight: 21, ability: "Each night*, choose 2 players: they can't die tonight, but 1 is drunk until dusk." },
    { id: "gambler", name: "Gambler", type: "townsfolk", edition: "bmr", otherNight: 22, ability: "Each night*, choose a player & guess their character: if you guess wrong, you die." },
    { id: "gossip", name: "Gossip", type: "townsfolk", edition: "bmr", otherNight: 23, ability: "Each day, you may make a public statement. Tonight, if it was true, a player dies." },
    { id: "courtier", name: "Courtier", type: "townsfolk", edition: "bmr", firstNight: 19, otherNight: 9, oncePerGame: true, ability: "Once per game, at night, choose a character: they are drunk for 3 nights & 3 days." },
    { id: "professor", name: "Professor", type: "townsfolk", edition: "bmr", otherNight: 44, oncePerGame: true, ability: "Once per game, at night*, choose a dead player: if they are a Townsfolk, they are resurrected." },
    { id: "minstrel", name: "Minstrel", type: "townsfolk", edition: "bmr", ability: "When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow." },
    { id: "tealady", name: "Tea Lady", type: "townsfolk", edition: "bmr", ability: "If both your alive neighbours are good, they can't die." },
    { id: "pacifist", name: "Pacifist", type: "townsfolk", edition: "bmr", ability: "Executed good players might not die." },
    { id: "fool", name: "Fool", type: "townsfolk", edition: "bmr", ability: "The 1st time you die, you don't." },

    { id: "tinker", name: "Tinker", type: "outsider", edition: "bmr", otherNight: 47, ability: "You might die at any time." },
    { id: "moonchild", name: "Moonchild", type: "outsider", edition: "bmr", otherNight: 46, ability: "When you learn that you died, publicly choose 1 alive player. Tonight, if it was a good player, they die." },
    { id: "goon", name: "Goon", type: "outsider", edition: "bmr", ability: "Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment." },
    { id: "lunatic", name: "Lunatic", type: "outsider", edition: "bmr", firstNight: 22, otherNight: 8, ability: "You think you are a Demon, but your abilities malfunction. The Demon knows who you are & who you choose at night." },

    { id: "godfather", name: "Godfather", type: "minion", edition: "bmr", firstNight: 18, otherNight: 38, setup: true, ability: "You start knowing which Outsiders are in play. If 1 died today, choose a player tonight: they die. [-1 or +1 Outsider]" },
    { id: "devilsadvocate", name: "Devil's Advocate", type: "minion", edition: "bmr", firstNight: 20, otherNight: 10, ability: "Each night, choose a living player (different to last night): if executed tomorrow, they don't die." },
    { id: "assassin", name: "Assassin", type: "minion", edition: "bmr", otherNight: 39, oncePerGame: true, ability: "Once per game, at night*, choose a player: they die, even if for some reason they could not." },
    { id: "mastermind", name: "Mastermind", type: "minion", edition: "bmr", ability: "If the Demon dies by execution (ending the game), play for 1 more day. If a player is then executed, their team loses." },

    { id: "zombuul", name: "Zombuul", type: "demon", edition: "bmr", otherNight: 6, ability: "Each night*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead." },
    { id: "pukka", name: "Pukka", type: "demon", edition: "bmr", firstNight: 28, otherNight: 7, ability: "Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy." },
    { id: "shabaloth", name: "Shabaloth", type: "demon", edition: "bmr", otherNight: 24, ability: "Each night*, choose 2 players: they die. A dead player you chose last night might be regurgitated." },
    { id: "po", name: "Po", type: "demon", edition: "bmr", otherNight: 25, ability: "Each night*, you may choose a player: they die. If you chose no-one last night, choose 3 players tonight." },
  ],
};
