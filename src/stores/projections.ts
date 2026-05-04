import type { RoleRegistry } from "@/data/roleRegistry";
import type {
  PlayerId,
  PlayerPublicRecord,
  PlayerSelfRecord,
  PublicLobbyRecord,
  STPlayerRecord,
  StorytellerLobbyRecord,
} from "./types";

export function projectToSelf(
  p: STPlayerRecord,
  registry: RoleRegistry
): PlayerSelfRecord {
  const shownRole = p.shownRole ?? p.actualRole;
  const shownAlignment = p.shownAlignment ?? registry.alignmentOf(shownRole);
  const out: PlayerSelfRecord = { shownRole, shownAlignment };
  const pi = p.privateInfo;
  if (pi?.bluffs && pi.bluffs.length > 0) out.bluffs = [...pi.bluffs];
  if (pi?.fakeMinions && pi.fakeMinions.length > 0)
    out.fakeMinions = [...pi.fakeMinions];
  if (pi?.extraText) out.extraText = pi.extraText;
  return out;
}

export function projectToPublic(
  p: STPlayerRecord,
  online: boolean
): PlayerPublicRecord {
  const out: PlayerPublicRecord = {
    id: p.id,
    name: p.name,
    seat: p.seat,
    alive: p.alive,
    ghostVote: p.ghostVote,
    online,
    joinedAt: p.joinedAt,
    isTraveler: p.isTraveler,
  };
  if (p.publicDisplayRole) out.publicDisplayRole = p.publicDisplayRole;
  return out;
}

export type OnlineMap = Record<PlayerId, boolean>;

export function projectLobbyToPublic(
  st: StorytellerLobbyRecord,
  online: OnlineMap
): PublicLobbyRecord {
  const players: Record<PlayerId, PlayerPublicRecord> = {};
  for (const id of Object.keys(st.players)) {
    const p = st.players[id]!;
    players[id] = projectToPublic(p, !!online[id]);
  }
  const out: PublicLobbyRecord = {
    code: st.code,
    scriptId: st.scriptId,
    phase: st.phase,
    day: st.day,
    seatOrder: [...st.seatOrder],
    players,
    fabled: [...st.fabled],
    lorics: [...(st.lorics ?? [])],
  };
  return out;
}

export function projectLobbyToSelfMap(
  st: StorytellerLobbyRecord,
  registry: RoleRegistry
): Record<PlayerId, PlayerSelfRecord> {
  const out: Record<PlayerId, PlayerSelfRecord> = {};
  for (const id of Object.keys(st.players)) {
    const p = st.players[id]!;
    // Skip unassigned seats. `projectToSelf` requires a resolvable role
    // (otherwise alignmentOf throws). An unassigned player has nothing to
    // project — once the ST assigns a role, the next sync includes them.
    const role = p.shownRole ?? p.actualRole;
    if (!role) continue;
    out[id] = projectToSelf(p, registry);
  }
  return out;
}
