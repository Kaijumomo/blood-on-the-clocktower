import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/playerStore";
import { connectFirebase } from "@/firebase/session";
import { isFirebaseConfigured } from "@/firebase/config";
import { joinLobby, usePlayerSync } from "@/firebase/playerSync";
import { checkLobbyStatus } from "@/firebase/lobby";
import { friendlyFirebaseError } from "@/firebase/errors";
import { FirebaseConfigDialog } from "@/features/firebase/FirebaseConfigDialog";
import type { RoomBackend } from "@/firebase/backend";
import { lookupOfficialRole } from "@/data/officialRoles";

type Props = {
  initialCode?: string;
};

export function PlayerScreen({ initialCode }: Props) {
  const status = usePlayerStore((s) => s.status);
  const code = usePlayerStore((s) => s.code);
  const requestedName = usePlayerStore((s) => s.requestedName);
  const playerId = usePlayerStore((s) => s.playerId);
  const self = usePlayerStore((s) => s.self);
  const publicLobby = usePlayerStore((s) => s.publicLobby);
  const revealed = usePlayerStore((s) => s.revealed);
  const error = usePlayerStore((s) => s.error);

  const setRevealed = usePlayerStore((s) => s.setRevealed);
  const reset = usePlayerStore((s) => s.reset);

  const [backend, setBackend] = useState<RoomBackend | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // On mount: connect to Firebase. If we have a saved session (code+uid),
  // re-establish; otherwise wait for the join form.
  useEffect(() => {
    let mounted = true;
    if (!isFirebaseConfigured()) {
      setConfigOpen(true);
      return;
    }
    (async () => {
      try {
        const { backend: b, uid } = await connectFirebase();
        if (!mounted) return;
        setBackend(b);
        // If we have a saved session whose uid matches the one we just got,
        // we're auto-reconnecting and should resume from "waiting" or
        // "seated" state — the subscription effect will catch us up.
        const ps = usePlayerStore.getState();
        if (ps.code && ps.uid === uid) {
          // Verify the lobby hasn't ended before resuming the session.
          const lobbyStatus = await checkLobbyStatus(b, ps.code);
          if (lobbyStatus === "ended") {
            ps.setEnded();
            return;
          }
          ps.setStatus(ps.playerId ? "seated" : "waiting");
        } else if (ps.code && ps.uid && ps.uid !== uid) {
          // uid changed (e.g., user wiped storage). Leave session intact —
          // they need to re-knock with the new uid.
          ps.setStatus("idle");
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[player connect]", e instanceof Error ? e.message : e);
        const friendly = friendlyFirebaseError(e, "player");
        usePlayerStore
          .getState()
          .setStatus("error", `${friendly.title}: ${friendly.message}`);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  usePlayerSync(backend);

  const onJoinSubmit = async (joinCode: string, name: string) => {
    if (!backend) {
      usePlayerStore
        .getState()
        .setStatus("error", "Not connected to Firebase yet — try again in a moment.");
      return;
    }
    try {
      const { uid } = await connectFirebase();
      await joinLobby(backend, joinCode.trim().toUpperCase(), uid, name);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[joinSubmit]", e instanceof Error ? e.message : e);
      const friendly = friendlyFirebaseError(e, "player");
      usePlayerStore
        .getState()
        .setStatus("error", `${friendly.title}: ${friendly.message}`);
    }
  };

  if (configOpen) {
    return (
      <div className="player">
        <h1 className="home-title">New Blood</h1>
        <p className="home-subtitle">Configure Firebase to join a lobby.</p>
        <FirebaseConfigDialog
          onClose={() => setConfigOpen(false)}
          onSaved={async () => {
            try {
              const { backend: b } = await connectFirebase();
              setBackend(b);
              setConfigOpen(false);
            } catch {
              // Stay in config view if connect fails
            }
          }}
        />
      </div>
    );
  }

  // Lobby ended — shown when the live status watch fires or session recovery
  // detects an ended lobby. Must come BEFORE the !code branch because
  // setEnded() clears code to prevent a stale session from being re-used.
  if (status === "ended") {
    return (
      <div className="player player-status">
        <h2 className="title">Game ended</h2>
        <p className="behavior-help">
          The Storyteller has ended the game. Thanks for playing!
        </p>
        <button className="btn" onClick={() => reset()}>
          Back to start
        </button>
      </div>
    );
  }

  // Show join form when there's no session yet
  if (!code || status === "idle" || status === "configuring") {
    return (
      <div className="player">
        <h1 className="home-title">Join lobby</h1>
        <PlayerJoinForm
          initialCode={initialCode ?? ""}
          onSubmit={onJoinSubmit}
        />
        {error && (
          <div className="error-list" role="alert">
            <strong>Error:</strong>
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Connecting / knocking / waiting
  if (status === "connecting" || status === "knocking") {
    return (
      <div className="player player-status">
        <h2 className="title">Connecting…</h2>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="player player-status">
        <h2 className="title">Joined as {requestedName}</h2>
        <p className="behavior-help">
          Code: <strong>{code}</strong>. Waiting for the Storyteller to
          seat you.
        </p>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            reset();
          }}
        >
          Leave
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="player player-status">
        <h2 className="title">Disconnected</h2>
        <div className="error-list" role="alert">
          <strong>Error:</strong>
          <p>{error}</p>
        </div>
        <button className="btn" onClick={() => reset()}>
          Reset
        </button>
      </div>
    );
  }

  // Seated
  return (
    <div className="player player-seated">
      <header className="player-header">
        <span className="label">{requestedName}</span>
        <span className="label">Code {code}</span>
        <span className="label">{publicLobby?.phase ?? "—"}</span>
      </header>
      <SealedCard self={self} revealed={revealed} onReveal={() => setRevealed(true)} />
      <TownView publicLobby={publicLobby} ownPlayerId={playerId} />
    </div>
  );
}

function PlayerJoinForm({
  initialCode,
  onSubmit,
}: {
  initialCode: string;
  onSubmit: (code: string, name: string) => Promise<void> | void;
}) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    if (!code.trim()) {
      setFormError("Enter a lobby code.");
      return;
    }
    if (!name.trim()) {
      setFormError("Enter your name.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(code, name);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="player-join-form">
      <label className="field">
        <span className="field-label">Lobby code</span>
        <input
          className="input"
          value={code}
          onChange={(e) => { setCode(e.target.value); setFormError(null); }}
          onKeyDown={handleKeyDown}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={8}
          placeholder="ABCD"
        />
      </label>
      <label className="field">
        <span className="field-label">Your name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => { setName(e.target.value); setFormError(null); }}
          onKeyDown={handleKeyDown}
          autoCapitalize="words"
          maxLength={32}
          placeholder="Bob"
        />
      </label>
      {formError && (
        <p className="field-error" role="alert">
          {formError}
        </p>
      )}
      <button
        className="btn btn-gold"
        onClick={submit}
        disabled={submitting}
      >
        {submitting ? "Knocking…" : "Knock to join"}
      </button>
    </div>
  );
}

function SealedCard({
  self,
  revealed,
  onReveal,
}: {
  self: { shownRole: string; shownAlignment: "good" | "evil"; bluffs?: string[]; fakeMinions?: string[] } | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    if (self !== null) { setWaitedLong(false); return; }
    const t = setTimeout(() => setWaitedLong(true), 5000);
    return () => clearTimeout(t);
  }, [self]);

  if (!self) {
    return (
      <div className="sealed-card">
        <p className="behavior-help">
          The Storyteller hasn't sent your role yet.
        </p>
        {waitedLong && (
          <p className="behavior-help" style={{ marginTop: 8, opacity: 0.7 }}>
            Still waiting — the Storyteller may still be setting up. Check with them directly.
          </p>
        )}
      </div>
    );
  }
  if (!revealed) {
    return (
      <button className="sealed-card sealed-card-button" onClick={onReveal}>
        <span className="sealed-card-back">Tap to reveal your role</span>
      </button>
    );
  }
  const role = lookupOfficialRole(self.shownRole);
  return (
    <div className="sealed-card revealed">
      <div className="sealed-card-name">
        {role?.name ?? self.shownRole}
        <span className={`label type-${role?.type ?? "townsfolk"}`}>
          {role?.type ?? "townsfolk"}
        </span>
        <span
          className={`label alignment-${self.shownAlignment}`}
        >
          {self.shownAlignment}
        </span>
      </div>
      {role?.ability && <p className="sealed-card-ability">{role.ability}</p>}
      {self.bluffs && self.bluffs.length > 0 && (
        <div className="sealed-card-bluffs">
          <span className="label">Bluffs (3 not-in-play characters)</span>
          <ul>
            {self.bluffs.map((b) => {
              const r = lookupOfficialRole(b);
              return <li key={b}>{r?.name ?? b}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function TownView({
  publicLobby,
  ownPlayerId,
}: {
  publicLobby: { players: Record<string, { id: string; name: string; seat: number; alive: boolean; ghostVote: boolean; online: boolean; isTraveler: boolean }>; seatOrder: string[]; fabled?: string[] } | null;
  ownPlayerId: string | null;
}) {
  if (!publicLobby) {
    return null;
  }
  const activeFabled = publicLobby.fabled ?? [];
  return (
    <div className="town-view">
      {activeFabled.length > 0 && (
        <div className="town-fabled">
          <span className="label">Fabled</span>
          {activeFabled.map((id) => {
            const r = lookupOfficialRole(id);
            return (
              <span key={id} className="fabled-strip-item" title={r?.ability}>
                {r?.name ?? id}
              </span>
            );
          })}
        </div>
      )}
      <h3 className="drawer-section-title">Town</h3>
      <ul className="town-list">
        {publicLobby.seatOrder.map((id) => {
          const p = publicLobby.players[id];
          if (!p) return null;
          const isYou = id === ownPlayerId;
          return (
            <li
              key={id}
              className={`town-row ${p.alive ? "" : "dead"} ${isYou ? "you" : ""}`}
            >
              <span className="label">seat {p.seat + 1}</span>
              <span className="town-name">
                {p.name}
                {isYou && " (you)"}
              </span>
              <span className="label">{p.alive ? "alive" : "dead"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
