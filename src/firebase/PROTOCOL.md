# Lobby protocol — load-bearing decisions

These decisions are not negotiable without revisiting the privacy boundary.

## Path layout (matches `paths.ts` and `rules.json`)

```
lobbies/{code}/
  storytellerUid          — string (the ST's uid). Whoever set this first owns
                            the lobby. Rules enforce write-once.
  roster                  — collection. ST-only read (.read scoped to ST).
  roster/{uid}            — string. TWO PHASES (see below). Read = ST or self.
  presence/{uid}          — { online, lastSeen }. Self-write only.
  public/                 — town-view projection. ST writes; readable by ST or
                            anyone with a roster entry (incl. knock state).
  player/{playerId}       — per-player projection. ST writes; only the matching
                            player reads (rule: roster/{auth.uid} === $playerId).
  storyteller/            — full ST state. ST writes and reads only.
```

**Rule note (added during 5-hardening pass):** `roster/$uid/.read` was added
so a player can read their own roster entry. Without it, `runTransaction`
on the player's knock path failed because the transaction's read step was
denied by the ST-only collection rule. The collection-level
`roster/.read` is now ST-only — players cannot enumerate the roster, only
read their own slot.

## Roster — two-phase protocol

`roster/{uid}` is a single string field with two distinct meanings depending
on whether the ST has seated this player yet.

**Phase 1 — knock-on-the-door (player writes):**
- Player gets an anonymous uid.
- Player writes `roster/{uid} = "<their requested name>"`.
- Rules allow this only if the entry doesn't already exist (`!data.exists()`)
  AND the path's uid matches `auth.uid`. So a player cannot impersonate.
- At this point the value is the player's *requested name*, NOT a playerId.

**Phase 2 — playerId binding (ST overwrites):**
- ST watches `roster/`. On a new entry whose value is not a known playerId,
  ST treats it as a join request, allocates a fresh `playerId`, and:
- ST does a multi-path atomic update writing both:
  - `player/{playerId}` ← projected `PlayerSelfRecord`
  - `roster/{uid}` ← `playerId` (overwrites the name with the binding)
- Now `roster/{auth.uid} === playerId` — the rule's read-gate is satisfied
  exactly when the player record is in place. There is no gap window.

The roster value transitions: `null → name → playerId`. It never returns to
a previous shape (ST can rename via the `name` field on the player record;
the `roster/{uid}` value stays as the playerId binding).

## Why we don't use `playerId === uid`

Two reasons:
1. The ST can pre-populate seats *before* anyone joins (e.g., setup with 8
   placeholder seats from prior games), and these seats have stable UUIDs
   that have no auth identity.
2. A player who refreshes (and re-runs anonymous auth) gets a *new* uid. If
   `playerId === uid`, the player would lose their seat on refresh. With the
   roster binding, we can also let the player's seat survive a re-auth by
   ST re-binding `roster/{newUid} → existing playerId`. (This piece — the
   re-bind UX — is in 5c, not 5a.)

## Reconnect policy

**ST refresh:** *local store wins.* The ST is the only writer to `storyteller/`,
`public/`, and `player/{...}`. On refresh, the ST app:
1. Restores from localStorage (Zustand persist, already present).
2. Re-authenticates anonymously (uid stable across refresh in the same
   browser, but treat it as if it could change).
3. Re-establishes sync by calling `writeProjections` once with the local
   state. This re-uploads everything; any racing roster knock from a player
   that arrived during the refresh is read after sync starts.
4. Subscribes to `roster/` to pick up any phase-1 knocks that landed during
   the refresh.

This means: an ST refresh during gameplay does not lose ST state, but a
roster join request that arrived *during* the refresh is processed when the
ST app sees it after reconnect. There is no merging of state — local always
wins because there is no other writer.

**Player refresh:** *remote wins.* The player has no canonical state of
their own to merge — they are a pure consumer of the projection. On refresh:
1. Re-authenticate anonymously.
2. Read `roster/{uid}` to discover own playerId (or rebind if needed).
3. Subscribe to `player/{playerId}` and `public/`.

## Write amplification — the strategy is "full projection on every change, debounced 200ms"

`writeProjections` writes the full lobby projection on every call. We do not
diff per-player.

Rationale:
- A status-chip toggle and a role assignment both go through the same write.
  Predictable cost is better than a complex diff that might miss an edge.
- The projection functions are pure and deterministic given the input state,
  so re-running them is cheap.
- 200ms debounce prevents UI scrubbing (drag-reorder, fast toggling) from
  saturating the write rate.

To revisit if write costs become a real concern: implement per-path diff in
`writeProjections` while keeping it as the sole API. Callers don't change.

## TOCTOU on code generation

Use `setIfAbsent(lobbies/{code}/storytellerUid, uid)` (Firebase
`runTransaction`) to claim a lobby. If the transaction returns
`{ committed: false }`, regenerate a new code and retry. Never:

- Read code → check absent → write (TOCTOU race; two STs can claim the same
  code in parallel).
- Use a fixed code for testing — collision rate too high.

The 4-character random code from `[BCDFGHJKLMNPQRSTVWXYZ23456789]` (no
ambiguous-glyph chars) gives ~16M codes. Realistic collision rate at this
scale is negligible, but the transaction is the seatbelt.

## The privacy chokepoint

All writes outside `storyteller/` go through `writeProjections` in
`sync.ts`. There must be no other call site that touches `public/...`,
`player/{...}/...`, or `roster/{...}` *except* the join-protocol paths
described above.

The `sync.test.ts` suite asserts this is true at the unit-test layer by
inspecting `MemoryRoomBackend.writeLog`. Adding a new sync write *without*
adding it to the test suite is a code-review-blocking change.
