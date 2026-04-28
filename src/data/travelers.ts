import type { RoleDef, RoleId } from "@/stores/types";

export const TRAVELERS: RoleDef[] = [
  { id: "scapegoat", name: "Scapegoat", type: "traveler", edition: "tb", ability: "If a player of your alignment is executed, you might be executed instead." },
  { id: "gunslinger", name: "Gunslinger", type: "traveler", edition: "tb", ability: "Each day, after the 1st vote has been tallied, you may choose a player who voted: they die." },
  { id: "beggar", name: "Beggar", type: "traveler", edition: "tb", ability: "You must use a vote token to vote. Dead players may give you theirs. If a dead player did, you learn their alignment." },
  { id: "bureaucrat", name: "Bureaucrat", type: "traveler", edition: "tb", firstNight: 1, otherNight: 1, ability: "Each night, choose a player (not yourself): their vote counts as 3 votes tomorrow." },
  { id: "thief", name: "Thief", type: "traveler", edition: "tb", firstNight: 2, otherNight: 2, ability: "Each night, choose a player (not yourself): their vote counts as -1 tomorrow." },

  { id: "butcher", name: "Butcher", type: "traveler", edition: "snv", ability: "Each day, after the 1st execution, you may nominate again." },
  { id: "bonecollector", name: "Bone Collector", type: "traveler", edition: "snv", otherNight: 45, oncePerGame: true, ability: "Once per game, at night, choose a dead player: they regain their ability until dusk." },
  { id: "harlot", name: "Harlot", type: "traveler", edition: "snv", otherNight: 26, ability: "Each night*, choose a living player: if they agree, you learn their character, but you both might die." },
  { id: "barista", name: "Barista", type: "traveler", edition: "snv", firstNight: 38, otherNight: 5, ability: "Each night, until dusk, a player is sober & healthy, OR their ability works twice. They learn which." },
  { id: "deviant", name: "Deviant", type: "traveler", edition: "snv", ability: "If you were funny today, you cannot die by exile." },

  { id: "apprentice", name: "Apprentice", type: "traveler", edition: "bmr", firstNight: 3, ability: "On your 1st night, you gain a Townsfolk ability (if good) or a Minion ability (if evil)." },
  { id: "matron", name: "Matron", type: "traveler", edition: "bmr", ability: "Each day, you may choose up to 3 sets of 2 players to swap seats. Players may not leave their seats to talk in private." },
  { id: "voudon", name: "Voudon", type: "traveler", edition: "bmr", ability: "Only you and the dead can vote. They don't need a vote token to do so. A 50% majority is not required." },
  { id: "judge", name: "Judge", type: "traveler", edition: "bmr", oncePerGame: true, ability: "Once per game, if another player nominated, you may choose to force the current execution to pass or fail." },
  { id: "bishop", name: "Bishop", type: "traveler", edition: "bmr", ability: "Only the Storyteller can nominate. At least 1 opposing player must be nominated each day." },
];

const byId = new Map<RoleId, RoleDef>();
for (const r of TRAVELERS) byId.set(r.id, r);

export function getTraveler(id: RoleId): RoleDef | undefined {
  return byId.get(id);
}

export function listTravelers(): RoleDef[] {
  return TRAVELERS;
}
