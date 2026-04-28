import { useEffect } from "react";
import { useStorytellerStore } from "@/stores/storytellerStore";
import { HomeScreen } from "@/features/home/HomeScreen";
import { GameScreen } from "@/features/game/GameScreen";
import { PlayerScreen } from "@/features/player/PlayerScreen";
import { isFirebaseConfigured } from "@/firebase/config";
import { connectFirebase } from "@/firebase/session";

function readJoinCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("join")) return null;
  const join = params.get("join") ?? "";
  return join.trim().toUpperCase();
}

export function App() {
  const joinCode = readJoinCodeFromUrl();
  const view = useStorytellerStore((s) => s.view);

  // Auto-init Firebase if config is present (.env.local or saved manually).
  // Lazy-loads the SDK chunk; errors surface in the action UI on retry.
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    connectFirebase().catch((e) => {
      // eslint-disable-next-line no-console
      console.warn("[firebase auto-connect]", e);
    });
  }, []);

  if (joinCode !== null) {
    return (
      <div className="app">
        <PlayerScreen initialCode={joinCode} />
      </div>
    );
  }
  return (
    <div className="app">
      {view === "game" ? <GameScreen /> : <HomeScreen />}
    </div>
  );
}
