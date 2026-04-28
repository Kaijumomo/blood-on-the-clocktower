import { useEffect, useState } from "react";
import { publicPath } from "./paths";
import type { RoomBackend, Unsubscribe } from "./backend";
import type { PublicLobbyRecord } from "@/stores/types";

// Public-only subscription. Reads ONLY `lobbies/{code}/public` — never the
// storyteller, player-private, roster, or presence paths. Mirrors the inner
// public watcher in `playerSync.ts` (lines 99–116) but without coupling to
// `usePlayerStore` (which carries player-identity state).
export function subscribeToPublicLobby(
  backend: RoomBackend,
  code: string,
  cb: (value: PublicLobbyRecord | null) => void
): Unsubscribe {
  return backend.subscribe(publicPath(code), (value) => {
    if (value === undefined || value === null) {
      cb(null);
      return;
    }
    cb(value as unknown as PublicLobbyRecord);
  });
}

export type UsePublicLobbyResult = {
  publicLobby: PublicLobbyRecord | null;
  ended: boolean;
  loading: boolean;
};

export function usePublicLobby(
  backend: RoomBackend | null,
  code: string | null
): UsePublicLobbyResult {
  const [publicLobby, setPublicLobby] = useState<PublicLobbyRecord | null>(null);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backend || !code) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setEnded(false);
    setPublicLobby(null);

    let cancelled = false;
    let unsub: (() => void) | null = null;

    // Probe permission with a one-shot `get()` first. Firebase's `onValue`
    // does not surface permission_denied to the value callback (it only goes
    // to an unwired error callback), so an unauthorized device would otherwise
    // hang on "loading" forever. `get()` rejects on permission_denied, which
    // we map to the same "not found / not authorized" empty state as a
    // missing lobby.
    backend
      .get(publicPath(code))
      .then(() => {
        if (cancelled) return;
        unsub = subscribeToPublicLobby(backend, code, (value) => {
          setLoading(false);
          if (value === null) {
            setPublicLobby(null);
            setEnded(false);
            return;
          }
          if (value.status === "ended") {
            setEnded(true);
            setPublicLobby(value);
            return;
          }
          setEnded(false);
          setPublicLobby(value);
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setPublicLobby(null);
        setEnded(false);
      });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [backend, code]);

  return { publicLobby, ended, loading };
}
