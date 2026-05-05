import type { RoleDef, RoleId } from "@/stores/types";

export const TRAVELERS: RoleDef[] = [
  { id: "scapegoat", name: "Scapegoat", type: "traveler", edition: "tb",
    ability: "If a player of your alignment is executed, you might be executed instead.",
    flavor: '"Send me. I have the right shape for it."' },
  { id: "gunslinger", name: "Gunslinger", type: "traveler", edition: "tb",
    ability: "Each day, after the 1st vote has been tallied, you may choose a player who voted: they die.",
    flavor: '"One bullet for the loud. The quiet keep theirs."' },
  { id: "beggar", name: "Beggar", type: "traveler", edition: "tb",
    ability: "You must use a vote token to vote. Dead players may give you theirs. If a dead player did, you learn their alignment.",
    flavor: '"Spare a vote, friend. Spare a name."' },
  { id: "bureaucrat", name: "Bureaucrat", type: "traveler", edition: "tb", firstNight: 1, otherNight: 1,
    ability: "Each night, choose a player (not yourself): their vote counts as 3 votes tomorrow.",
    flavor: '"The form is in triplicate. So are you."' },
  { id: "thief", name: "Thief", type: "traveler", edition: "tb", firstNight: 2, otherNight: 2,
    ability: "Each night, choose a player (not yourself): their vote counts as -1 tomorrow.",
    flavor: '"Take a coin from each pocket. Each pocket forgives me."' },

  { id: "butcher", name: "Butcher", type: "traveler", edition: "snv",
    ability: "Each day, after the 1st execution, you may nominate again.",
    flavor: '"Two cuts in one breath. Three if the breath is long."' },
  { id: "bonecollector", name: "Bone Collector", type: "traveler", edition: "snv", otherNight: 45, oncePerGame: true,
    ability: "Once per game, at night, choose a dead player: they regain their ability until dusk.",
    flavor: '"The dead leave gifts. The dead always leave gifts."' },
  { id: "harlot", name: "Harlot", type: "traveler", edition: "snv", otherNight: 26,
    ability: "Each night*, choose a living player: if they agree, you learn their character, but you both might die.",
    flavor: '"A secret shared is a debt to be settled."' },
  { id: "barista", name: "Barista", type: "traveler", edition: "snv", firstNight: 38, otherNight: 5,
    ability: "Each night, until dusk, a player is sober & healthy, OR their ability works twice. They learn which.",
    flavor: '"Two shots, and a steady hand."' },
  { id: "deviant", name: "Deviant", type: "traveler", edition: "snv",
    ability: "If you were funny today, you cannot die by exile.",
    flavor: '"They can\'t hang a punchline."' },

  { id: "apprentice", name: "Apprentice", type: "traveler", edition: "bmr", firstNight: 3,
    ability: "On your 1st night, you gain a Townsfolk ability (if good) or a Minion ability (if evil).",
    flavor: '"My turn at the bench. Watch — and please don\'t."' },
  { id: "matron", name: "Matron", type: "traveler", edition: "bmr",
    ability: "Each day, you may choose up to 3 sets of 2 players to swap seats. Players may not leave their seats to talk in private.",
    flavor: '"Sit. Sit. Sit. Now talk to her."' },
  { id: "voudon", name: "Voudon", type: "traveler", edition: "bmr",
    ability: "Only you and the dead can vote. They don't need a vote token to do so. A 50% majority is not required.",
    flavor: '"The hands behind me are doing most of the voting."' },
  { id: "judge", name: "Judge", type: "traveler", edition: "bmr", oncePerGame: true,
    ability: "Once per game, if another player nominated, you may choose to force the current execution to pass or fail.",
    flavor: '"Order. ORDER. The court will recess for tea."' },
  { id: "bishop", name: "Bishop", type: "traveler", edition: "bmr",
    ability: "Only the Storyteller can nominate. At least 1 opposing player must be nominated each day.",
    flavor: '"Diagonal moves only. Even on Tuesdays."' },

  // Experimental travellers
  { id: "gangster", name: "Gangster", type: "traveler", edition: "experimental",
    ability: "Once per day, you may choose to kill an alive neighbour, if your other alive neighbour agrees.",
    flavor: '"Family business. The neighbours always understand."' },
  { id: "gnome", name: "Gnome", type: "traveler", edition: "experimental",
    ability: "Each night, choose a character: you learn how many players have that character.",
    flavor: '"Small foot, large ledger."' },
];

const byId = new Map<RoleId, RoleDef>();
for (const r of TRAVELERS) byId.set(r.id, r);

export function getTraveler(id: RoleId): RoleDef | undefined {
  return byId.get(id);
}

export function listTravelers(): RoleDef[] {
  return TRAVELERS;
}
