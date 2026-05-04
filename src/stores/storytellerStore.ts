import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BUILTIN_SCRIPTS, BUILTIN_SCRIPT_IDS } from "@/data/scripts";
import { FABLED } from "@/data/fabled";
import { LORICS } from "@/data/lorics";
import { StorytellerStateSchema } from "./schemas";
import type {
  Alignment,
  BehaviorMode,
  NightStepRecord,
  NightStepStatus,
  PlayerId,
  RoleId,
  Script,
  STPlayerRecord,
  StorytellerLobbyRecord,
} from "./types";

const UNDO_LIMIT = 20;

let _migrationResetFlag = false;
/** Returns true (once) when migrate() discarded incompatible persisted state. */
export function takeMigrationResetFlag(): boolean {
  const v = _migrationResetFlag;
  _migrationResetFlag = false;
  return v;
}

const newId = (): PlayerId =>
  globalThis.crypto?.randomUUID?.() ?? `p-${Math.random().toString(36).slice(2, 10)}`;

const blankPlayer = (id: PlayerId, name: string, seat: number): STPlayerRecord => ({
  id,
  name,
  seat,
  joinedAt: Date.now(),
  actualRole: "",
  shownRole: null,
  shownAlignment: null,
  behaviorMode: "normal",
  publicDisplayRole: null,
  alive: true,
  ghostVote: true,
  abilityUsed: false,
  statuses: {},
  reminders: [],
  stNotes: "",
  isTraveler: false,
});

const clone = <T,>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

export type AddScriptResult = { ok: true } | { ok: false; error: string };

export type LobbyConnection = {
  code: string;
  uid: string;
  status: "live" | "reconnecting";
};

export type StorytellerStore = {
  game: StorytellerLobbyRecord | null;
  view: "home" | "game";
  undoStack: StorytellerLobbyRecord[];
  selectedPlayerId: PlayerId | null;
  customScripts: Record<string, Script>;
  lobby: LobbyConnection | null;
  // ephemeral — knocks the ST has not yet processed
  pendingKnocks: { uid: string; name: string }[];

  newGame: (scriptId: string) => void;
  endGame: () => void;
  setView: (view: "home" | "game") => void;
  selectPlayer: (id: PlayerId | null) => void;
  addCustomScript: (script: Script) => AddScriptResult;
  removeCustomScript: (id: string) => void;
  setLobby: (lobby: LobbyConnection | null) => void;
  setLobbyStatus: (status: LobbyConnection["status"]) => void;
  setPendingKnocks: (knocks: { uid: string; name: string }[]) => void;
  seatPlayerFromKnock: (uid: string, name: string) => PlayerId | null;
  bindRosterUid: (uid: string, playerId: PlayerId) => void;

  addPlayer: (name: string) => void;
  removePlayer: (id: PlayerId) => void;
  renamePlayer: (id: PlayerId, name: string) => void;
  setSeatOrder: (order: PlayerId[]) => void;
  movePlayer: (id: PlayerId, direction: "left" | "right") => void;

  assignRole: (id: PlayerId, roleId: RoleId | "") => void;
  setShownRole: (id: PlayerId, roleId: RoleId | null) => void;
  setShownAlignment: (id: PlayerId, alignment: Alignment | null) => void;
  setBehaviorMode: (id: PlayerId, mode: BehaviorMode) => void;
  setBluffs: (id: PlayerId, bluffs: RoleId[]) => void;
  setFakeMinions: (id: PlayerId, playerIds: PlayerId[]) => void;
  setIsTraveler: (id: PlayerId, isTraveler: boolean) => void;
  setFabled: (fabled: RoleId[]) => void;
  setLorics: (lorics: RoleId[]) => void;

  setAlive: (id: PlayerId, alive: boolean) => void;
  setGhostVote: (id: PlayerId, ghostVote: boolean) => void;
  setAbilityUsed: (id: PlayerId, used: boolean) => void;
  setStatus: (id: PlayerId, status: string, on: boolean) => void;
  setReminders: (id: PlayerId, reminders: string[]) => void;
  setNotes: (id: PlayerId, notes: string) => void;

  setPhase: (phase: StorytellerLobbyRecord["phase"]) => void;
  advancePhase: () => void;

  setNightStepStatus: (day: number, stepKey: string, status: NightStepStatus) => void;
  setNightStepNotes: (day: number, stepKey: string, notes: string) => void;
  clearNightProgress: (day: number) => void;

  undo: () => void;
};

const pushUndo = (
  game: StorytellerLobbyRecord | null,
  stack: StorytellerLobbyRecord[]
): StorytellerLobbyRecord[] => {
  if (!game) return stack;
  const next = [...stack, clone(game)];
  if (next.length > UNDO_LIMIT) next.shift();
  return next;
};

const patchPlayer = (
  game: StorytellerLobbyRecord,
  id: PlayerId,
  patch: Partial<STPlayerRecord>
): StorytellerLobbyRecord => {
  const existing = game.players[id];
  if (!existing) return game;
  return {
    ...game,
    players: {
      ...game.players,
      [id]: { ...existing, ...patch },
    },
  };
};

const CLEAN_STATE = { game: null, view: "home" as const, undoStack: [] as never[], customScripts: {}, lobby: null };

export function migrateStoreState(state: unknown, fromVersion: number): unknown {
  const s = state as { game?: Record<string, unknown>; undoStack?: unknown[] };
  if (fromVersion < 2) {
    if (s.game && !s.game.nightProgress) s.game.nightProgress = {};
    if (s.undoStack) {
      s.undoStack = s.undoStack.map((entry) => {
        const e = entry as Record<string, unknown>;
        if (!e.nightProgress) e.nightProgress = {};
        return e;
      });
    }
  }
  if (fromVersion < 3) {
    if (s.game) {
      if (!s.game.fabled) s.game.fabled = [];
      if (!s.game.bluffs) s.game.bluffs = [];
    }
    if (s.undoStack) {
      s.undoStack = s.undoStack.map((entry) => {
        const e = entry as Record<string, unknown>;
        if (!e.fabled) e.fabled = [];
        if (!e.bluffs) e.bluffs = [];
        return e;
      });
    }
  }
  if (fromVersion < 4) {
    if (s.game && !s.game.lorics) s.game.lorics = [];
    if (s.undoStack) {
      s.undoStack = s.undoStack.map((entry) => {
        const e = entry as Record<string, unknown>;
        if (!e.lorics) e.lorics = [];
        return e;
      });
    }
  }
  const check = StorytellerStateSchema.safeParse(state);
  if (!check.success) {
    // eslint-disable-next-line no-console
    console.warn("[migrate] persisted state failed validation, resetting:", check.error.flatten());
    _migrationResetFlag = true;
    return CLEAN_STATE;
  }
  return state;
}

export const useStorytellerStore = create<StorytellerStore>()(
  persist(
    (set, get) => ({
      game: null,
      view: "home",
      undoStack: [],
      selectedPlayerId: null,
      customScripts: {},
      lobby: null,
      pendingKnocks: [],

      newGame: (scriptId: string) => {
        const script =
          BUILTIN_SCRIPTS[scriptId] ?? get().customScripts[scriptId];
        if (!script) throw new Error(`Unknown script id: ${scriptId}`);
        const game: StorytellerLobbyRecord = {
          code: "",
          storytellerUid: "local",
          scriptId: script.id,
          phase: "setup",
          day: 0,
          bluffs: [],
          fabled: [],
          lorics: [],
          notes: "",
          players: {},
          seatOrder: [],
          nightProgress: {},
        };
        set({ game, view: "game", undoStack: [], selectedPlayerId: null });
      },

      endGame: () =>
        set({
          game: null,
          view: "home",
          undoStack: [],
          selectedPlayerId: null,
          lobby: null,
          pendingKnocks: [],
        }),

      setView: (view) => set({ view }),

      selectPlayer: (id) => set({ selectedPlayerId: id }),

      setLobby: (lobby) => set({ lobby }),

      setLobbyStatus: (status) => {
        const { lobby } = get();
        if (!lobby) return;
        set({ lobby: { ...lobby, status } });
      },

      setPendingKnocks: (knocks) => set({ pendingKnocks: knocks }),

      seatPlayerFromKnock: (_uid, name) => {
        const { game } = get();
        if (!game) return null;
        const trimmed = name.trim();
        if (!trimmed) return null;
        const id = newId();
        const seat = game.seatOrder.length;
        const player = blankPlayer(id, trimmed, seat);
        set({
          game: {
            ...game,
            players: { ...game.players, [id]: player },
            seatOrder: [...game.seatOrder, id],
          },
        });
        return id;
      },

      bindRosterUid: (_uid, _playerId) => {
        // No-op in local store. The actual roster→playerId binding lives
        // in the Firebase write done by the sync engine.
      },

      addCustomScript: (script) => {
        if (BUILTIN_SCRIPT_IDS.has(script.id)) {
          return {
            ok: false,
            error: `Script id "${script.id}" conflicts with a built-in script. Rename and re-import.`,
          };
        }
        const { customScripts } = get();
        if (customScripts[script.id]) {
          return {
            ok: false,
            error: `A custom script with id "${script.id}" is already imported. Remove it first to replace.`,
          };
        }
        set({
          customScripts: { ...customScripts, [script.id]: script },
        });
        return { ok: true };
      },

      removeCustomScript: (id) => {
        const { customScripts, game } = get();
        if (!customScripts[id]) return;
        const next = { ...customScripts };
        delete next[id];
        // If the active game uses this script, end it cleanly.
        if (game && game.scriptId === id) {
          set({
            customScripts: next,
            game: null,
            view: "home",
            undoStack: [],
            selectedPlayerId: null,
          });
        } else {
          set({ customScripts: next });
        }
      },

      addPlayer: (name) => {
        const { game, undoStack } = get();
        if (!game) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = newId();
        const seat = game.seatOrder.length;
        const player = blankPlayer(id, trimmed, seat);
        set({
          undoStack: pushUndo(game, undoStack),
          game: {
            ...game,
            players: { ...game.players, [id]: player },
            seatOrder: [...game.seatOrder, id],
          },
        });
      },

      removePlayer: (id) => {
        const { game, undoStack, selectedPlayerId } = get();
        if (!game || !game.players[id]) return;
        const players = { ...game.players };
        delete players[id];
        const seatOrder = game.seatOrder.filter((p) => p !== id);
        // re-seat the remaining players to keep seats contiguous 0..n-1,
        // and scrub any fakeMinion reference to the removed player.
        const renumbered: typeof players = {};
        seatOrder.forEach((pid, idx) => {
          const p = players[pid];
          if (!p) return;
          let next = { ...p, seat: idx };
          if (next.privateInfo?.fakeMinions?.includes(id)) {
            const filtered = next.privateInfo.fakeMinions.filter(
              (mid) => mid !== id
            );
            const pi = { ...next.privateInfo };
            if (filtered.length > 0) pi.fakeMinions = filtered;
            else delete pi.fakeMinions;
            next = {
              ...next,
              privateInfo: Object.keys(pi).length > 0 ? pi : undefined,
            };
          }
          renumbered[pid] = next;
        });
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, players: renumbered, seatOrder },
          selectedPlayerId: selectedPlayerId === id ? null : selectedPlayerId,
        });
      },

      renamePlayer: (id, name) => {
        const { game, undoStack } = get();
        if (!game) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { name: trimmed }),
        });
      },

      setSeatOrder: (order) => {
        const { game, undoStack } = get();
        if (!game) return;
        const renumbered = { ...game.players };
        order.forEach((pid, idx) => {
          const p = renumbered[pid];
          if (p) renumbered[pid] = { ...p, seat: idx };
        });
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, players: renumbered, seatOrder: [...order] },
        });
      },

      movePlayer: (id, direction) => {
        const { game, undoStack } = get();
        if (!game) return;
        const order = [...game.seatOrder];
        const i = order.indexOf(id);
        if (i < 0) return;
        const j = direction === "left" ? i - 1 : i + 1;
        if (j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j]!, order[i]!];
        const renumbered = { ...game.players };
        order.forEach((pid, idx) => {
          const p = renumbered[pid];
          if (p) renumbered[pid] = { ...p, seat: idx };
        });
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, players: renumbered, seatOrder: order },
        });
      },

      assignRole: (id, roleId) => {
        const { game, undoStack } = get();
        if (!game) return;
        const existing = game.players[id];
        if (!existing) return;
        // Build the patch: clear all deception state including bluffs/fakeMinions.
        // privateInfo is dropped entirely by overwriting and then deleting.
        const next: STPlayerRecord = {
          ...existing,
          actualRole: roleId,
          shownRole: null,
          shownAlignment: null,
          behaviorMode: "normal",
          abilityUsed: false,
        };
        delete next.privateInfo;
        set({
          undoStack: pushUndo(game, undoStack),
          game: {
            ...game,
            players: { ...game.players, [id]: next },
          },
        });
      },

      setShownRole: (id, roleId) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { shownRole: roleId }),
        });
      },

      setShownAlignment: (id, alignment) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { shownAlignment: alignment }),
        });
      },

      setBehaviorMode: (id, mode) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { behaviorMode: mode }),
        });
      },

      setBluffs: (id, bluffs) => {
        const { game, undoStack } = get();
        if (!game) return;
        const player = game.players[id];
        if (!player) return;
        const next = { ...player };
        const cleaned = bluffs.filter((b) => !!b).slice(0, 3);
        if (cleaned.length === 0) {
          // Drop the bluffs key entirely; if privateInfo becomes empty, drop it too.
          if (next.privateInfo) {
            const { bluffs: _drop, ...rest } = next.privateInfo;
            const remaining = Object.keys(rest).length > 0 ? rest : undefined;
            if (remaining) next.privateInfo = remaining;
            else delete next.privateInfo;
          }
        } else {
          next.privateInfo = { ...(next.privateInfo ?? {}), bluffs: cleaned };
        }
        set({
          undoStack: pushUndo(game, undoStack),
          game: {
            ...game,
            players: { ...game.players, [id]: next },
          },
        });
      },

      setFakeMinions: (id, playerIds) => {
        const { game, undoStack } = get();
        if (!game) return;
        const player = game.players[id];
        if (!player) return;
        const valid = playerIds.filter((pid) => !!game.players[pid] && pid !== id);
        const next = { ...player };
        if (valid.length === 0) {
          if (next.privateInfo) {
            const { fakeMinions: _drop, ...rest } = next.privateInfo;
            const remaining = Object.keys(rest).length > 0 ? rest : undefined;
            if (remaining) next.privateInfo = remaining;
            else delete next.privateInfo;
          }
        } else {
          next.privateInfo = {
            ...(next.privateInfo ?? {}),
            fakeMinions: valid,
          };
        }
        set({
          undoStack: pushUndo(game, undoStack),
          game: {
            ...game,
            players: { ...game.players, [id]: next },
          },
        });
      },

      setIsTraveler: (id, isTraveler) => {
        const { game, undoStack } = get();
        if (!game) return;
        const existing = game.players[id];
        if (!existing) return;
        const next: STPlayerRecord = {
          ...existing,
          isTraveler,
          actualRole: "",
        };
        delete next.privateInfo;
        set({
          undoStack: pushUndo(game, undoStack),
          game: {
            ...game,
            players: { ...game.players, [id]: next },
          },
        });
      },

      setFabled: (fabled) => {
        const { game, undoStack } = get();
        if (!game) return;
        const validIds = new Set(FABLED.map((f) => f.id));
        const deduped = [...new Set(fabled.filter((id) => validIds.has(id)))];
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, fabled: deduped },
        });
      },

      setLorics: (lorics) => {
        const { game, undoStack } = get();
        if (!game) return;
        const validIds = new Set(LORICS.map((l) => l.id));
        const deduped = [...new Set(lorics.filter((id) => validIds.has(id)))];
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, lorics: deduped },
        });
      },

      setAlive: (id, alive) => {
        const { game, undoStack } = get();
        if (!game) return;
        const player = game.players[id];
        if (!player) return;
        const patch: Partial<STPlayerRecord> = { alive };
        if (alive && !player.alive) patch.ghostVote = true;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, patch),
        });
      },

      setGhostVote: (id, ghostVote) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { ghostVote }),
        });
      },

      setAbilityUsed: (id, abilityUsed) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { abilityUsed }),
        });
      },

      setStatus: (id, status, on) => {
        const { game, undoStack } = get();
        if (!game) return;
        const player = game.players[id];
        if (!player) return;
        const statuses = { ...player.statuses };
        if (on) statuses[status] = true;
        else delete statuses[status];
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { statuses }),
        });
      },

      setReminders: (id, reminders) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { reminders: [...reminders] }),
        });
      },

      setNotes: (id, notes) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: patchPlayer(game, id, { stNotes: notes }),
        });
      },

      setPhase: (phase) => {
        const { game, undoStack } = get();
        if (!game) return;
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, phase },
        });
      },

      advancePhase: () => {
        const { game, undoStack } = get();
        if (!game) return;
        let { phase, day } = game;
        if (phase === "setup") {
          phase = "night";
          day = 1;
        } else if (phase === "night") {
          phase = "day";
        } else if (phase === "day") {
          phase = "night";
          day = day + 1;
        }
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, phase, day },
        });
      },

      setNightStepStatus: (day, stepKey, status) => {
        const { game, undoStack } = get();
        if (!game) return;
        const key = `${day}:${stepKey}`;
        const np = game.nightProgress ?? {};
        const existing: NightStepRecord = np[key] ?? { status: "pending", notes: "" };
        set({
          undoStack: pushUndo(game, undoStack),
          game: {
            ...game,
            nightProgress: { ...np, [key]: { ...existing, status } },
          },
        });
      },

      setNightStepNotes: (day, stepKey, notes) => {
        const { game } = get();
        if (!game) return;
        const key = `${day}:${stepKey}`;
        const np = game.nightProgress ?? {};
        const existing: NightStepRecord = np[key] ?? { status: "pending", notes: "" };
        // No undo push — avoid polluting undo stack with every keystroke.
        set({
          game: {
            ...game,
            nightProgress: { ...np, [key]: { ...existing, notes } },
          },
        });
      },

      clearNightProgress: (day) => {
        const { game, undoStack } = get();
        if (!game) return;
        const prefix = `${day}:`;
        const next: Record<string, NightStepRecord> = {};
        for (const [k, v] of Object.entries(game.nightProgress ?? {})) {
          if (!k.startsWith(prefix)) next[k] = v;
        }
        set({
          undoStack: pushUndo(game, undoStack),
          game: { ...game, nightProgress: next },
        });
      },

      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        const previous = undoStack[undoStack.length - 1]!;
        set({
          game: clone(previous),
          undoStack: undoStack.slice(0, -1),
        });
      },
    }),
    {
      name: "new-blood-st",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateStoreState,
      partialize: (s) => ({
        game: s.game,
        view: s.view,
        undoStack: s.undoStack,
        customScripts: s.customScripts,
        lobby: s.lobby,
      }),
    }
  )
);

export const selectScriptById = (
  s: StorytellerStore,
  id: string
): Script | undefined => BUILTIN_SCRIPTS[id] ?? s.customScripts[id];
