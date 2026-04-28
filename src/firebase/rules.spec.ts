// Adversarial tests against `rules.json` using the Firebase RTDB emulator.
// REQUIRES the emulator running on port 9000 (`npm run emulator`).
// The tests SKIP themselves if the emulator isn't reachable so npm test
// stays green when devs don't have firebase-tools installed.
//
// Run with: npm run test:rules

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const PROJECT_ID = "new-blood-rules-test";
const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 9000;

let env: RulesTestEnvironment;
let emulatorAvailable = false;

beforeAll(async () => {
  // Probe emulator. If unreachable, skip the entire suite gracefully.
  try {
    const res = await fetch(`http://${EMULATOR_HOST}:${EMULATOR_PORT}/.json`);
    emulatorAvailable = res.ok || res.status === 401 || res.status === 404;
  } catch {
    emulatorAvailable = false;
  }
  if (!emulatorAvailable) {
    // eslint-disable-next-line no-console
    console.warn(
      `[rules.spec] Skipping — RTDB emulator not reachable at ${EMULATOR_HOST}:${EMULATOR_PORT}. Start with: npm run emulator`
    );
    return;
  }
  const rules = readFileSync(
    resolve(__dirname, "rules.json"),
    "utf-8"
  );
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      rules,
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
    },
  });
});

afterAll(async () => {
  if (env) await env.cleanup();
});

beforeEach(async () => {
  if (!emulatorAvailable) return;
  await env.clearDatabase();
});

describe.skipIf(!emulatorAvailable)("Firebase RTDB security rules", () => {
  const stUid = "uid-storyteller";
  const aliceUid = "uid-alice";
  const bobUid = "uid-bob";
  const code = "ABCD";

  /** Set up a lobby owned by `stUid`, with Alice seated as p-alice and a
   *  bare-bones public projection. Uses an unrestricted writer so the
   *  fixture itself isn't gated by rules under test. */
  async function seedLobby() {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.database();
      await db.ref(`lobbies/${code}`).set({
        storytellerUid: stUid,
        roster: { [aliceUid]: "p-alice" },
        public: {
          code,
          scriptId: "tb",
          phase: "setup",
          day: 0,
          seatOrder: ["p-alice"],
          players: {
            "p-alice": {
              id: "p-alice",
              name: "Alice",
              seat: 0,
              alive: true,
              ghostVote: true,
              online: true,
              joinedAt: 0,
              isTraveler: false,
            },
          },
          fabled: [],
        },
        player: {
          "p-alice": { shownRole: "chef", shownAlignment: "good" },
        },
        storyteller: {
          notes: "secret notes",
          bluffs: ["chef", "saint", "virgin"],
          players: {
            "p-alice": { actualRole: "drunk", shownRole: "chef" },
          },
        },
      });
    });
  }

  // -------------------------------------------------------------------- 1
  test("ST can claim storytellerUid when absent", async () => {
    const ctx = env.authenticatedContext(stUid);
    await assertSucceeds(
      ctx.database().ref(`lobbies/${code}/storytellerUid`).set(stUid)
    );
  });

  // -------------------------------------------------------------------- 2
  test("non-ST cannot overwrite an existing storytellerUid", async () => {
    await seedLobby();
    const attacker = env.authenticatedContext(bobUid);
    await assertFails(
      attacker.database().ref(`lobbies/${code}/storytellerUid`).set(bobUid)
    );
  });

  // -------------------------------------------------------------------- 3
  test("ST can write storyteller/", async () => {
    await seedLobby();
    const st = env.authenticatedContext(stUid);
    await assertSucceeds(
      st.database().ref(`lobbies/${code}/storyteller/notes`).set("new note")
    );
  });

  // -------------------------------------------------------------------- 4
  test("seated player CANNOT read storyteller/", async () => {
    await seedLobby();
    const alice = env.authenticatedContext(aliceUid);
    await assertFails(alice.database().ref(`lobbies/${code}/storyteller`).once("value"));
  });

  // -------------------------------------------------------------------- 5
  test("seated player CANNOT write storyteller/", async () => {
    await seedLobby();
    const alice = env.authenticatedContext(aliceUid);
    await assertFails(
      alice.database().ref(`lobbies/${code}/storyteller/notes`).set("hijack")
    );
  });

  // -------------------------------------------------------------------- 6
  test("ST can write any roster entry", async () => {
    await seedLobby();
    const st = env.authenticatedContext(stUid);
    await assertSucceeds(
      st.database().ref(`lobbies/${code}/roster/${bobUid}`).set("p-bob")
    );
  });

  // -------------------------------------------------------------------- 7
  test("player can write their OWN roster entry only when absent (knock)", async () => {
    // Lobby exists but Bob has not knocked yet.
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.database().ref(`lobbies/${code}/storytellerUid`).set(stUid);
    });
    const bob = env.authenticatedContext(bobUid);
    await assertSucceeds(
      bob.database().ref(`lobbies/${code}/roster/${bobUid}`).set("Bob")
    );
    // A second knock attempt at the now-occupied path should fail (no
    // self-overwrite).
    await assertFails(
      bob.database().ref(`lobbies/${code}/roster/${bobUid}`).set("Bob2")
    );
  });

  // -------------------------------------------------------------------- 8
  test("player CANNOT write someone else's roster entry (no privilege escalation)", async () => {
    await seedLobby();
    const bob = env.authenticatedContext(bobUid);
    await assertFails(
      bob.database().ref(`lobbies/${code}/roster/${aliceUid}`).set("hijacked")
    );
    // And cannot overwrite storytellerUid via roster trickery
    await assertFails(
      bob.database().ref(`lobbies/${code}/storytellerUid`).set(bobUid)
    );
  });

  // -------------------------------------------------------------------- 9
  test("seated player can read public/", async () => {
    await seedLobby();
    const alice = env.authenticatedContext(aliceUid);
    await assertSucceeds(alice.database().ref(`lobbies/${code}/public`).once("value"));
  });

  // -------------------------------------------------------------------- 10
  test("player CANNOT read another player's player/{playerId}", async () => {
    // Add Bob into the lobby with his own player path
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.database().ref(`lobbies/${code}`).update({
        [`roster/${bobUid}`]: "p-bob",
        [`player/p-bob`]: { shownRole: "imp", shownAlignment: "evil" },
      });
    });
    await seedLobby();
    // Re-seed (clearDatabase wiped) then add Bob
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.database().ref(`lobbies/${code}`).update({
        [`roster/${bobUid}`]: "p-bob",
        [`player/p-bob`]: { shownRole: "imp", shownAlignment: "evil" },
      });
    });
    const alice = env.authenticatedContext(aliceUid);
    // Alice's own path: allowed
    await assertSucceeds(alice.database().ref(`lobbies/${code}/player/p-alice`).once("value"));
    // Bob's path: denied
    await assertFails(alice.database().ref(`lobbies/${code}/player/p-bob`).once("value"));
  });

  // -------------------------------------------------------------------- 11
  test("player CANNOT read full roster collection", async () => {
    await seedLobby();
    const alice = env.authenticatedContext(aliceUid);
    await assertFails(alice.database().ref(`lobbies/${code}/roster`).once("value"));
    // But CAN read their own roster entry
    await assertSucceeds(alice.database().ref(`lobbies/${code}/roster/${aliceUid}`).once("value"));
  });

  // -------------------------------------------------------------------- 12
  test("unauthenticated client cannot do anything", async () => {
    await seedLobby();
    const anon = env.unauthenticatedContext();
    await assertFails(anon.database().ref(`lobbies/${code}/public`).once("value"));
    await assertFails(anon.database().ref(`lobbies/${code}/storyteller`).once("value"));
    await assertFails(
      anon.database().ref(`lobbies/${code}/storytellerUid`).set("anon-claim")
    );
  });

  // -------------------------------------------------------------------- 13
  test("ST cannot write a non-string to storytellerUid", async () => {
    const st = env.authenticatedContext(stUid);
    await assertFails(
      st.database().ref(`lobbies/${code}/storytellerUid`).set(42 as unknown as string)
    );
  });

  // -------------------------------------------------------------------- 14
  test("non-roster device CANNOT read public/ (roster membership required)", async () => {
    await seedLobby();
    // Bob exists as an authenticated user but has NOT knocked — not in roster.
    const bob = env.authenticatedContext(bobUid);
    await assertFails(bob.database().ref(`lobbies/${code}/public`).once("value"));
  });

  // -------------------------------------------------------------------- 15
  test("roster member CANNOT write to player/{playerId} (only ST may write)", async () => {
    await seedLobby();
    // Alice IS in the roster but is not the storyteller.
    const alice = env.authenticatedContext(aliceUid);
    await assertFails(
      alice.database().ref(`lobbies/${code}/player/p-alice`).set({ shownRole: "imp" })
    );
    await assertFails(
      alice.database().ref(`lobbies/${code}/player/p-alice`).set(null)
    );
  });
});

describe.skipIf(emulatorAvailable)("[rules.spec] emulator unavailable", () => {
  test("skipped — start emulator with `npm run emulator` and re-run", () => {
    expect(true).toBe(true);
  });
});
