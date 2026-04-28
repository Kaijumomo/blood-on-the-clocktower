import type {
  PlayerId,
  RoleId,
  RoleType,
  STPlayerRecord,
  Script,
  RoleDef,
} from "@/stores/types";
import { getTraveler } from "@/data/travelers";

export type NightStep =
  | {
      kind: "global";
      stepKey: string;
      label: string;
      prompt: string;
      reminder: string;
      order: number;
    }
  | {
      kind: "player";
      stepKey: string;       // "p:{playerId}"
      playerId: PlayerId;
      playerName: string;
      seat: number;
      alive: boolean;
      abilityUsed: boolean;
      effectiveRoleId: RoleId;
      effectiveRoleName: string;
      roleType: RoleType;
      prompt: string;
      reminder: string;
      order: number;
      isDeceived: boolean;
    };

// ---------------------------------------------------------------------------
// Global first-night step constants
// ---------------------------------------------------------------------------

const DEMON_INFO_BASE = {
  kind: "global" as const,
  stepKey: "demonInfo",
  order: 5,
  label: "Demon — learns Minions & Bluffs",
  reminder: "Demon must know all Minions and all 3 bluffs. If a Lunatic is in play they were woken first and given fake info.",
};

const MINION_INFO_STEP: NightStep = {
  kind: "global",
  stepKey: "minionInfo",
  order: 7,
  label: "Minions — learn each other & the Demon",
  prompt: "Wake all Minions together. They make eye contact. Show them who the Demon is.",
  reminder: "All Minions wake simultaneously. The Demon keeps their eyes closed. Marionette is NOT woken here.",
};

// ---------------------------------------------------------------------------
// Effective role resolution per behavior mode
// ---------------------------------------------------------------------------

function effectiveRole(
  player: STPlayerRecord,
  roleMap: Map<RoleId, RoleDef>
): { roleId: RoleId; roleDef: RoleDef; isDeceived: boolean } | null {
  const mode = player.behaviorMode;

  // Marionette produces no step.
  if (mode === "marionette_fake_good_behavior") return null;

  let roleId: RoleId;
  let isDeceived = false;

  if (mode === "drunk_fake_role_behavior" || mode === "fake_demon_behavior") {
    // Wake at shownRole's time. If shownRole is unset the step is skipped —
    // falling back to actualRole would reveal the actual identity in the UI.
    if (!player.shownRole) return null;
    roleId = player.shownRole;
    isDeceived = true;
  } else {
    // normal | poisoned | custom — wake at actualRole's time.
    roleId = player.actualRole;
  }

  const roleDef = roleMap.get(roleId);
  if (!roleDef) return null;

  return { roleId, roleDef, isDeceived };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeNightOrder(
  players: Record<PlayerId, STPlayerRecord>,
  seatOrder: PlayerId[],
  script: Script,
  isFirstNight: boolean
): NightStep[] {
  const roleMap = new Map<RoleId, RoleDef>(
    script.characters.map((r) => [r.id, r])
  );
  for (const id of seatOrder) {
    const p = players[id];
    if (p?.isTraveler && p.actualRole) {
      const t = getTraveler(p.actualRole);
      if (t) roleMap.set(t.id, t);
    }
  }

  const steps: NightStep[] = [];

  // Global steps — first night only.
  if (isFirstNight) {
    // Detect Marionette in play to annotate demonInfo prompt.
    const hasMarionette = seatOrder.some(
      (id) =>
        players[id]?.behaviorMode === "marionette_fake_good_behavior"
    );
    const demonInfoPrompt =
      "Wake the Demon. Show them: these are your Minions. These 3 characters are not in play (bluffs)." +
      (hasMarionette
        ? " If a Marionette is in play, indicate them to the Demon."
        : "");

    steps.push({ ...DEMON_INFO_BASE, prompt: demonInfoPrompt });
    steps.push(MINION_INFO_STEP);
  }

  // Player steps.
  for (const playerId of seatOrder) {
    const player = players[playerId];
    if (!player || player.actualRole === "") continue;

    const resolved = effectiveRole(player, roleMap);
    if (!resolved) continue;

    const { roleId, roleDef, isDeceived } = resolved;

    const orderValue = isFirstNight ? roleDef.firstNight : roleDef.otherNight;
    if (orderValue === undefined) continue; // no night action this night

    const prompt = isFirstNight
      ? (roleDef.firstNightPrompt ?? roleDef.ability ?? "")
      : (roleDef.otherNightPrompt ?? roleDef.ability ?? "");

    const reminder = isFirstNight
      ? (roleDef.firstNightReminder ?? "")
      : (roleDef.otherNightReminder ?? "");

    steps.push({
      kind: "player",
      stepKey: `p:${playerId}`,
      playerId,
      playerName: player.name,
      seat: player.seat,
      alive: player.alive,
      abilityUsed: player.abilityUsed,
      effectiveRoleId: roleId,
      effectiveRoleName: roleDef.name,
      roleType: roleDef.type,
      prompt,
      reminder,
      order: orderValue,
      isDeceived,
    });
  }

  // Sort: by order ascending; globals before players at equal order; then by seat.
  steps.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.kind !== b.kind) return a.kind === "global" ? -1 : 1;
    if (a.kind === "player" && b.kind === "player") return a.seat - b.seat;
    return 0;
  });

  return steps;
}
