# Setup

## 1. Install

```
npm install
```

## 2. Configure Firebase

Copy `.env.example` to `.env.local` and fill in your Firebase project values
(Firebase Console → Project Settings → SDK setup and configuration → Config):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=https://YOUR-PROJECT-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

The apiKey is **public** by Firebase design — the auth boundary is the
security rules at `src/firebase/rules.json`. Do NOT put service account keys
in env files.

## 3. Enable Anonymous Auth

In Firebase Console → Authentication → Sign-in method → enable the
**Anonymous** provider. Players authenticate anonymously to claim a roster
slot.

If you skip this, the app will show:
> "Anonymous sign-in is disabled — Open Firebase Console → Authentication → Sign-in method, and enable the Anonymous provider for this project."

## 4. Enable Realtime Database

In Firebase Console → Build → Realtime Database → Create database. Choose a
location, then **Test mode** is fine because we'll override the rules in the
next step.

## 5. Deploy the security rules

```
npx firebase login           # one-time
npx firebase use YOUR-PROJECT-ID
npm run rules:deploy
```

This pushes `src/firebase/rules.json` to your project's Realtime Database. **You
must run this any time you change `rules.json`.** The default rules expire
after 30 days and become deny-all — that's the cause of most early
`permission_denied` errors.

## 6. Run the dev server

```
npm run dev
```

Open the printed URL on the Storyteller's tablet. The "Configure Firebase"
button is hidden when env vars are present; it stays available as a fallback
if config comes from `localStorage`.

## Player join flow

A player visits `<dev-server-url>/?join=ABCD` on their phone, enters their
name, and waits for the ST to seat them. The ST's app auto-seats new
knockers as they appear in the roster.

## Testing

```
npm run typecheck     # TypeScript across the project
npm test              # Vitest — protocol tests use MemoryRoomBackend
npm run build         # Production bundle
```

## Firebase rules tests (optional, requires emulator)

```
# In one terminal
npm run emulator       # firebase emulators:start --only database (requires Java)

# In another terminal
npm run test:rules
```

These verify the security rules enforce the privacy boundary against
adversarial uids.

## Full pre-release test suite

Run all checks (typecheck, unit tests, and rules tests) in a single command:

```
# Start the emulator first (separate terminal), then:
npm run test:full
```

`test:full` = `typecheck` + `vitest run` + `test:rules`. The rules suite
skips gracefully if the emulator is not running, so `test:full` is also safe
to run without the emulator for a quick sanity check.

## Deploying

Build a production bundle:

```
npm run build
```

This emits a `dist/` directory. The `firebaseBackend-*.js` chunk (Firebase SDK,
~340 kB gzip: ~73 kB) is split automatically — it loads on-demand when the
first Firebase call is made.

### Netlify / Cloudflare Pages

Drop `dist/` as the publish directory. The `public/_redirects` file (`/* /index.html 200`)
is copied into `dist/` automatically by Vite and enables client-side routing
(users can deep-link to `?join=ABCD` without getting a 404).

### Source maps

`build.sourcemap: true` is set in `vite.config.ts` — `.js.map` files are
included in `dist/`. They are safe to ship; they reveal source structure but
not secrets (no credentials live in source).

### Console stripping

`esbuild.drop: ["console", "debugger"]` is active for production builds — all
`console.log/warn/error` calls are removed from the bundle. This prevents
diagnostic output from leaking into players' browser consoles.

## Architecture documents

- `src/firebase/PROTOCOL.md` — load-bearing decisions (roster two-phase
  protocol, reconnect policy, write strategy)
- `src/firebase/PATH_AUDIT.md` — every RTDB path with its rule and access
  matrix
