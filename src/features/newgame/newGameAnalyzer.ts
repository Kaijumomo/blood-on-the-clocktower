import { analyzeBagCore, type BagAnalysis } from "@/features/setup/setupAnalyzer";
import type { RoleId, RoleDef } from "@/stores/types";

/**
 * Analyse a pre-pick role pool without needing seated player records.
 * Delegates to `analyzeBagCore` so all setup-shift rules (Baron, Godfather,
 * Fang Gu, Vigormortis) apply identically to the in-game SetupPanel.
 */
export function analyzeRolePool(
  rolePool: RoleId[],
  plannedPlayerCount: number,
  roleById: Map<RoleId, RoleDef>
): BagAnalysis {
  return analyzeBagCore({
    nonTravelerCount: plannedPlayerCount,
    travelerCount: 0,
    assignedRoleIds: rolePool,
    unassignedCount: Math.max(0, plannedPlayerCount - rolePool.length),
    roleById,
  });
}
