// Player-side state. Independent from storytellerStore — different role,
// different localStorage key. The player does not maintain canonical state;
// they read projections written by the ST.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlayerSelfRecord, PublicLobbyRecord } from "./types";

export type PlayerStatus =
  | "idle"
  | "configuring"
  | "connecting"
  | "knocking"
  | "waiting"
  | "seated"
  | "ended"
  | "error";

export type PlayerStore = {
  code: string | null;
  uid: string | null;
  playerId: string | null;
  requestedName: string | null;
  status: PlayerStatus;
  error: string | null;
  self: PlayerSelfRecord | null;
  publicLobby: PublicLobbyRecord | null;
  // UX flag — has the player tapped to reveal their sealed-card role yet?
  revealed: boolean;

  setStatus: (status: PlayerStatus, error?: string | null) => void;
  setSession: (s: { code: string; uid: string; requestedName: string }) => void;
  setPlayerId: (id: string | null) => void;
  setSelf: (self: PlayerSelfRecord | null) => void;
  setPublic: (p: PublicLobbyRecord | null) => void;
  setRevealed: (revealed: boolean) => void;
  /** Called when the live lobby ends. Clears session so localStorage is clean; sets status="ended". */
  setEnded: () => void;
  reset: () => void;
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      code: null,
      uid: null,
      playerId: null,
      requestedName: null,
      status: "idle",
      error: null,
      self: null,
      publicLobby: null,
      revealed: false,

      setStatus: (status, error = null) => set({ status, error }),
      setSession: ({ code, uid, requestedName }) =>
        set({ code, uid, requestedName, error: null }),
      setPlayerId: (id) => set({ playerId: id }),
      setSelf: (self) => set({ self }),
      setPublic: (publicLobby) => set({ publicLobby }),
      setRevealed: (revealed) => set({ revealed }),
      setEnded: () =>
        set({
          // Clear session fields so localStorage no longer points at an ended
          // lobby. `status` is not persisted, so on next page load the player
          // sees the fresh join form rather than re-entering "ended" state.
          code: null,
          uid: null,
          playerId: null,
          requestedName: null,
          status: "ended",
          error: null,
          self: null,
          publicLobby: null,
          revealed: false,
        }),
      reset: () =>
        set({
          code: null,
          uid: null,
          playerId: null,
          requestedName: null,
          status: "idle",
          error: null,
          self: null,
          publicLobby: null,
          revealed: false,
        }),
    }),
    {
      name: "new-blood-player",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        code: s.code,
        uid: s.uid,
        playerId: s.playerId,
        requestedName: s.requestedName,
        revealed: s.revealed,
      }),
    }
  )
);
