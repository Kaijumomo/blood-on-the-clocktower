// Firebase config resolution order:
//   1. Vite env vars (VITE_FIREBASE_*) — primary path; copy .env.example to
//      .env.local and fill in your Firebase project values.
//   2. localStorage — fallback for users without dev access who paste config
//      via the Configure dialog at runtime.
// The apiKey is public by Firebase design; the auth boundary is the security
// rules at src/firebase/rules.json. Do NOT put service account keys in env.

const STORAGE_KEY = "new-blood-fb-config";

export type FirebaseAppConfig = {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

export type ConfigSource = "env" | "localStorage" | "none";

/** Override for tests — when set, replaces import.meta.env reads. */
type EnvBag = Record<string, string | undefined>;
let envOverride: EnvBag | null = null;
export function __setEnvOverrideForTests(env: EnvBag | null): void {
  envOverride = env;
}

export function loadFirebaseConfig(): FirebaseAppConfig | null {
  const envCfg = readFromEnv();
  if (envCfg) return envCfg;
  return readFromStorage();
}

export function getConfigSource(): ConfigSource {
  if (readFromEnv()) return "env";
  if (readFromStorage()) return "localStorage";
  return "none";
}

export function saveFirebaseConfig(cfg: FirebaseAppConfig): void {
  if (!isValidConfig(cfg)) {
    throw new Error(
      "Invalid Firebase config: apiKey, databaseURL, and projectId are required."
    );
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isFirebaseConfigured(): boolean {
  return loadFirebaseConfig() !== null;
}

function readFromEnv(): FirebaseAppConfig | null {
  // Test override beats real env so localStorage-fallback tests can isolate.
  const env: EnvBag | undefined =
    envOverride ??
    (typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: EnvBag }).env
      : undefined);
  if (!env) return null;
  const cfg: FirebaseAppConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL ?? "",
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: env.VITE_FIREBASE_APP_ID || undefined,
  };
  return isValidConfig(cfg) ? cfg : null;
}

function readFromStorage(): FirebaseAppConfig | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidConfig(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isValidConfig(v: unknown): v is FirebaseAppConfig {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as FirebaseAppConfig).apiKey === "string" &&
    (v as FirebaseAppConfig).apiKey.length > 0 &&
    typeof (v as FirebaseAppConfig).databaseURL === "string" &&
    (v as FirebaseAppConfig).databaseURL.length > 0 &&
    typeof (v as FirebaseAppConfig).projectId === "string" &&
    (v as FirebaseAppConfig).projectId.length > 0
  );
}
