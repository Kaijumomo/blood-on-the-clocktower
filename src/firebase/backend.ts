// RoomBackend abstracts Firebase RTDB so that:
// 1. The sync engine can be unit-tested without Firebase credentials.
// 2. The privacy boundary (no `actualRole`/`shownRole`/`behaviorMode`/etc on
//    `public/*` or other-player paths) is testable as an API property, not a
//    discipline property.
//
// MemoryRoomBackend is for vitest only — NOT user-facing demo mode.

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json | undefined };

export type Unsubscribe = () => void;

export interface RoomBackend {
  /** Set a value at `path`. Equivalent to RTDB `set()`. */
  set(path: string, value: Json): Promise<void>;

  /** Read a value once at `path`. Returns undefined if no data. */
  get(path: string): Promise<Json | undefined>;

  /** Atomically apply a multi-path update (Firebase `update()` with paths as keys). */
  update(updates: Record<string, Json>): Promise<void>;

  /**
   * Compare-and-set on `path`: if `path` is currently absent, write `value` and
   * resolve `{ committed: true }`. If present, resolve `{ committed: false }`
   * with the existing value.
   */
  setIfAbsent(
    path: string,
    value: Json
  ): Promise<{ committed: true } | { committed: false; existing: Json }>;

  /** Subscribe to changes at `path`. Callback fires immediately with current value. */
  subscribe(path: string, cb: (value: Json | undefined) => void): Unsubscribe;
}
