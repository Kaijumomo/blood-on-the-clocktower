# Firebase path/rule audit

Every RTDB path the app reads or writes, with the rule that gates it. If you
add a new path, add it here AND update `rules.json`.

| Path | Used by code | Read by | Write by | Contains private data? | Rule allows what |
|---|---|---|---|---|---|
| `lobbies/{code}/storytellerUid` | `createLobby` (`setIfAbsent`), rules expressions everywhere | any authed user | only the original ST (write-once) | No (just a uid) | `.read: auth != null`. `.write: !data.exists() OR data === auth.uid` (write-once-then-self). `.validate: non-empty string` |
| `lobbies/{code}/roster` (collection) | `watchRoster` (ST only) | ST only | (no direct writes) | Names of joined players (low-sensitivity) | `.read: storytellerUid === auth.uid` (ST only) |
| `lobbies/{code}/roster/{uid}` | `knockOnLobby` (player), `seatPlayer` (ST), `usePlayerSync` (player watches own) | ST or self | ST always; player only their own and only if absent | Player's requested name (phase 1) or their playerId binding (phase 2) | `.read: storytellerUid === auth.uid OR uid === auth.uid`. `.write: storytellerUid === auth.uid OR (uid === auth.uid AND !data.exists())`. `.validate: non-empty string` |
| `lobbies/{code}/public` | `writeProjections` (ST), `usePlayerSync` (player) | ST or seated/knocked player (anyone with a roster entry) | ST only | **No** — strictly public projection (no role/alignment/notes/bluffs/private) | `.read: storytellerUid === auth.uid OR roster/{auth.uid} exists`. `.write: storytellerUid === auth.uid` |
| `lobbies/{code}/player/{playerId}` | `writeProjections` (ST writes all), `seatPlayer` (ST), `usePlayerSync` (player reads own) | ST or the matching player only | ST only | Yes — that player's `PlayerSelfRecord` (shownRole, shownAlignment, bluffs/fakeMinions if Lunatic) | `.read: storytellerUid === auth.uid OR roster/{auth.uid}.val() === $playerId`. `.write: storytellerUid === auth.uid` |
| `lobbies/{code}/storyteller` | `writeProjections` (ST writes full state) | ST only | ST only | Yes — entire `StorytellerLobbyRecord` including all `actualRole`/`shownRole`/`behaviorMode`/`privateInfo`/`stNotes` | `.read: storytellerUid === auth.uid`. `.write: storytellerUid === auth.uid` |
| `lobbies/{code}/presence/{uid}` | (not yet wired — reserved for online/lastSeen) | ST or seated/knocked player | self only | No — just `{online, lastSeen}` | `.read: storytellerUid === auth.uid OR roster/{auth.uid} exists`. `.write: $uid === auth.uid`. `.validate: hasChildren(['online','lastSeen'])` |

## Privilege escalation gates

- A player **cannot** become ST: rules check `data.val() === auth.uid` on `storytellerUid`. The only writer is the uid that initially claimed it (write-once for new claims; identity self-check for re-writes).
- A player **cannot** read another player's path: `player/{playerId}/.read` requires `roster/{auth.uid}.val() === $playerId`. Each authenticated player has at most one roster entry, which the ST controls. A second player could only read your `player/{X}` if their roster entry was bound to `X` — but the ST is the only writer who can do that.
- A player **cannot** read the full roster: `roster/.read` is ST-only. Players only read `roster/{their-own-uid}`.
- A player **cannot** read `storyteller/`: `.read` requires `storytellerUid === auth.uid`.
- A player **cannot** write to `public/`, `player/*`, or `storyteller/`: all of those `.write` rules require `storytellerUid === auth.uid`.
- A player **cannot** seat themselves with a forged playerId: their roster entry is initially their requested name (a string). The transition to a real playerId is done by ST via the `seatPlayer` multi-path update (which writes `player/{playerId}` AND rebinds `roster/{uid} = playerId` atomically). The player never has the write permission to fake this.
- A player **cannot** overwrite a roster binding: `roster/$uid/.write` requires `($uid === auth.uid && !data.exists())` for player writes — only ST can update an existing entry.

## What writes go where (verified by `sync.test.ts`)

`writeProjections` is the **single chokepoint** for any write outside
`storyteller/`. The MemoryBackend `writeLog` is asserted in tests to never
contain forbidden fields on `public/*` or `player/*`:

- `public/` forbidden: `actualRole`, `shownRole`, `shownAlignment`,
  `behaviorMode`, `privateInfo`, `stNotes`, `abilityUsed`, `statuses`,
  `reminders`, `bluffs`, `fakeMinions`
- `player/{id}/` forbidden: `actualRole`, `behaviorMode`, `privateInfo`,
  `stNotes`, `abilityUsed`, `statuses`, `reminders`
  (`shownRole`, `shownAlignment`, `bluffs`, `fakeMinions` are intentionally
  exposed on a player's *own* path — that's the projection's purpose)
