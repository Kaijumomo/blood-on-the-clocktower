// Centralised jinx table. Jinxes are pair-rule reminders that fire when both
// roles are in play together. We do NOT enforce them at runtime; the reason
// text is the rule, surfaced in setup, the storyteller grimoire, and the
// public display.
//
// Pairs are stored unordered: (a, b) and (b, a) are the same jinx. Lookup
// helpers normalize the order so callers don't need to.

import type { RoleId, Script } from "@/stores/types";

export type Jinx = {
  a: RoleId;
  b: RoleId;
  reason: string;
};

// Source: BOTC official Djinn list (community-maintained at the wiki).
// Add new jinxes here; UI code never hardcodes role pairs.
export const JINXES: Jinx[] = [
  // Trouble Brewing
  { a: "poisoner", b: "fortuneteller", reason: "If the Fortune Teller is poisoned, their red herring may now register as a Demon to them." },
  { a: "spy", b: "damsel", reason: "If both are in play, only 1 Spy learns that there is a Damsel." },

  // Sects & Violets
  { a: "vortox", b: "courtier", reason: "If the Courtier picks the Vortox, the Vortox is drunk for 3 nights & 3 days, but Townsfolk still get false info." },
  { a: "vortox", b: "savant", reason: "If the Vortox is in play, both Savant statements are false." },
  { a: "vortox", b: "minstrel", reason: "If the Vortox is in play and a Minion is executed, the Minstrel ability does not trigger." },
  { a: "pithag", b: "cannibal", reason: "If the Pit-Hag turns the Cannibal into another character, the Cannibal keeps the gained ability until tomorrow." },
  { a: "fanggu", b: "scarletwoman", reason: "If a Fang Gu kills the Scarlet Woman, the Scarlet Woman becomes an evil Townsfolk that the Fang Gu killed; she does not become the Demon." },

  // Bad Moon Rising
  { a: "godfather", b: "heretic", reason: "If both are in play, the Heretic does not register as an Outsider when the Godfather wakes on the first night." },
  { a: "lunatic", b: "mathematician", reason: "If the Lunatic attacks at night, the Mathematician learns of it as if a real attack occurred." },
  { a: "po", b: "minstrel", reason: "If the Po chose 3 players and a Minion was executed today, the Po's choice is overridden by the Minstrel ability." },
  { a: "shabaloth", b: "pukka", reason: "Cross-edition demons can never both be in play; this jinx is for clarity if a custom script attempts it." },
  { a: "pacifist", b: "minstrel", reason: "If a Minion is executed and Pacifist saves them, the Minstrel ability does not trigger." },

  // Common experimental
  { a: "imp", b: "pukka", reason: "Two demons cannot both be in play in the same script." },
  { a: "marionette", b: "investigator", reason: "If the Investigator's Minion is the Marionette, the Investigator may instead be shown the actual Marionette." },
  { a: "marionette", b: "librarian", reason: "If the Marionette is registering as the Outsider the Librarian sees, the Librarian's info is unchanged." },
  { a: "marionette", b: "lunatic", reason: "The Marionette and the Lunatic must not be in play together in the same script." },
  { a: "atheist", b: "any", reason: "If the Atheist is in play, the Storyteller may break any rule of the game, including jinxes." },
  { a: "fearmonger", b: "savant", reason: "If the Fearmonger declares a player evil and the Savant gives a hint, only one Savant statement need be true that day." },
  { a: "boomdandy", b: "amnesiac", reason: "If the Amnesiac copies a Boomdandy ability, the Storyteller decides what the ability does." },
  { a: "mastermind", b: "executioner", reason: "If the Mastermind survives execution day, the Executioner's chosen player is not protected." },
  { a: "vizier", b: "general", reason: "If both are in play, the General does not learn alignment of the Vizier on the first night." },
  { a: "djinn", b: "fabled", reason: "Use the Djinn's special rule. All players know what it is." },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

function pairKey(a: RoleId, b: RoleId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const byPair = new Map<string, Jinx>();
for (const j of JINXES) byPair.set(pairKey(j.a, j.b), j);

export function jinxBetween(a: RoleId, b: RoleId): Jinx | undefined {
  return byPair.get(pairKey(a, b));
}

/**
 * Return all jinxes whose pair is fully present in `roleIds`. Order of `a`/`b`
 * inside each returned Jinx is arbitrary — render them by name, not position.
 */
export function activeJinxesFor(roleIds: Iterable<RoleId>): Jinx[] {
  const present = new Set(roleIds);
  const out: Jinx[] = [];
  for (const j of JINXES) {
    if (j.b === "any" && present.has(j.a)) {
      out.push(j);
      continue;
    }
    if (present.has(j.a) && present.has(j.b)) out.push(j);
  }
  return out;
}

/**
 * Convenience: jinxes for a script's character list, optionally augmented by
 * any extra ids (e.g. selected Lorics or Travellers in play).
 */
export function jinxesForScript(script: Script, extraIds: RoleId[] = []): Jinx[] {
  const ids = [
    ...script.characters.map((c) => c.id),
    ...(script.fabled ?? []).map((f) => f.id),
    ...extraIds,
  ];
  return activeJinxesFor(ids);
}
