// Map raw Firebase error objects/codes to messages a Storyteller or player
// can act on. Sensitive details (uids, paths) are deliberately stripped so
// players don't see ST-specific guidance.

export type ErrorAudience = "st" | "player";

export type FriendlyError = {
  title: string;
  message: string;
  /** Optional console-only diagnostic for the user. */
  diagnostic?: string;
};

export function friendlyFirebaseError(
  err: unknown,
  audience: ErrorAudience = "st"
): FriendlyError {
  const code = extractCode(err);
  const raw = extractMessage(err);

  switch (code) {
    case "auth/admin-restricted-operation":
    case "auth/operation-not-allowed":
      return {
        title: "Anonymous sign-in is disabled",
        message:
          audience === "st"
            ? "Open Firebase Console → Authentication → Sign-in method, and enable the Anonymous provider for this project."
            : "The host's Firebase project hasn't enabled Anonymous sign-in. Ask the Storyteller to enable it.",
        diagnostic: raw,
      };

    case "auth/network-request-failed":
      return {
        title: "Can't reach Firebase",
        message:
          "Check your internet connection. If you're online, the Firebase project may be blocked by the network.",
        diagnostic: raw,
      };

    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
    case "auth/invalid-credential":
      return {
        title: "Firebase API key is invalid",
        message:
          audience === "st"
            ? "Check VITE_FIREBASE_API_KEY in .env.local matches the project. After editing .env.local, restart the dev server."
            : "The host's Firebase config is invalid. Ask the Storyteller to fix their setup.",
        diagnostic: raw,
      };

    case "PERMISSION_DENIED":
    case "permission_denied":
    case "auth/permission-denied":
      return {
        title: "Firebase permission denied",
        message:
          audience === "st"
            ? "Your database rules deny this write. Run `npm run rules:deploy` to push src/firebase/rules.json to your Firebase project. (Default rules expire after 30 days and become deny-all.)"
            : "The host's database rules denied this. Ask the Storyteller to deploy the latest rules.",
        diagnostic: raw,
      };

    case "DATABASE_NOT_FOUND":
    case "database-url-invalid":
      return {
        title: "Realtime Database not found",
        message:
          audience === "st"
            ? "Check VITE_FIREBASE_DATABASE_URL — it should look like https://YOUR-PROJECT-default-rtdb.firebaseio.com. Make sure Realtime Database is enabled in Firebase Console (Build → Realtime Database → Create database)."
            : "The host's Realtime Database isn't set up. Ask the Storyteller to create it.",
        diagnostic: raw,
      };

    case "auth/too-many-requests":
      return {
        title: "Too many requests",
        message: "Wait a minute and try again.",
        diagnostic: raw,
      };

    default:
      // Heuristic catches for messages that don't carry codes
      if (/permission_denied/i.test(raw)) {
        return {
          title: "Firebase permission denied",
          message:
            audience === "st"
              ? "Your database rules deny this write. Run `npm run rules:deploy` to push src/firebase/rules.json to your Firebase project."
              : "The host's database rules denied this.",
          diagnostic: raw,
        };
      }
      if (/network/i.test(raw) || /offline/i.test(raw)) {
        return {
          title: "Can't reach Firebase",
          message: "Check your internet connection and try again.",
          diagnostic: raw,
        };
      }
      if (/firebase is not configured/i.test(raw)) {
        return {
          title: "Firebase is not configured",
          message:
            audience === "st"
              ? "Copy .env.example to .env.local, fill in your Firebase project values, and restart the dev server. (Or paste config in the Configure dialog as a fallback.)"
              : "The host hasn't configured Firebase.",
          diagnostic: raw,
        };
      }
      if (/could not allocate a lobby code/i.test(raw)) {
        return {
          title: "Lobby code unavailable",
          message:
            "All generated codes are in use. Wait a moment and try again — codes free up as games end.",
          diagnostic: raw,
        };
      }
      return {
        title: "Something went wrong",
        message: raw || "Unknown Firebase error.",
        diagnostic: raw,
      };
  }
}

function extractCode(err: unknown): string {
  if (!err) return "";
  if (typeof err === "object" && err !== null) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  // Some RTDB errors use Error.message="permission_denied at /path"
  const msg = extractMessage(err);
  if (/permission_denied/i.test(msg)) return "permission_denied";
  return "";
}

function extractMessage(err: unknown): string {
  if (!err) return "";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err);
}
