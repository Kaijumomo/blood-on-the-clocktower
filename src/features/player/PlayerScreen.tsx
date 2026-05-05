import { useEffect, useMemo, useState } from "react";
import { usePlayerStore } from "@/stores/playerStore";
import type { TownNote, TownNoteTag } from "@/stores/playerStore";
import { connectFirebase } from "@/firebase/session";
import { isFirebaseConfigured } from "@/firebase/config";
import { joinLobby, usePlayerSync } from "@/firebase/playerSync";
import { checkLobbyStatus } from "@/firebase/lobby";
import { friendlyFirebaseError } from "@/firebase/errors";
import { FirebaseConfigDialog } from "@/features/firebase/FirebaseConfigDialog";
import type { RoomBackend } from "@/firebase/backend";
import { lookupOfficialRole } from "@/data/officialRoles";
import { iconUrlFor } from "@/data/iconUrl";
import type { PlayerPublicRecord, PublicLobbyRecord } from "@/stores/types";

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
        const ps = usePlayerStore.getState();
        if (ps.code && ps.uid === uid) {
          const lobbyStatus = await checkLobbyStatus(b, ps.code);
          if (lobbyStatus === "ended") {
            ps.setEnded();
            return;
          }
          ps.setStatus(ps.playerId ? "seated" : "waiting");
        } else if (ps.code && ps.uid && ps.uid !== uid) {
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
        <h1 className="home-title">Ravenswood Bluff</h1>
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
          Code: <strong>{code}</strong>. Waiting for the Storyteller to seat you.
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
      <TownView publicLobby={publicLobby} ownPlayerId={playerId} code={code} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Join form
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Wiki link helper
// ---------------------------------------------------------------------------

function wikiUrlFor(name: string): string {
  const slug = name
    .trim()
    .replace(/['']/g, "")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join("_");
  return `https://wiki.bloodontheclocktower.com/${slug}`;
}

// ---------------------------------------------------------------------------
// SealedCard — role reveal + per-bluff tap-to-reveal
// ---------------------------------------------------------------------------

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
  const [revealedBluffs, setRevealedBluffs] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (self !== null) { setWaitedLong(false); return; }
    const t = setTimeout(() => setWaitedLong(true), 5000);
    return () => clearTimeout(t);
  }, [self]);

  // Reset per-bluff reveal whenever the bluffs themselves change (new game).
  const bluffsKey = (self?.bluffs ?? []).join("|");
  useEffect(() => {
    setRevealedBluffs(new Set());
  }, [bluffsKey]);

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
  const roleName = role?.name ?? self.shownRole;
  const roleType = role?.type ?? "townsfolk";
  return (
    <div className="sealed-card revealed">
      <div className="sealed-card-art">
        <img
          src={iconUrlFor(role ?? self.shownRole)}
          alt=""
          loading="lazy"
          onError={(e) => {
            // Hide a broken image so the text below stays readable.
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="sealed-card-name">
        {roleName}
        <span className={`label type-${roleType}`}>{roleType}</span>
        <span className={`label alignment-${self.shownAlignment}`}>
          {self.shownAlignment}
        </span>
      </div>
      {role?.ability && <p className="sealed-card-ability">{role.ability}</p>}
      {role?.flavor && <p className="sealed-card-flavor">{role.flavor}</p>}
      <a
        className="sealed-card-wiki"
        href={wikiUrlFor(roleName)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Wiki ↗
      </a>
      {self.bluffs && self.bluffs.length > 0 && (
        <div className="sealed-card-bluffs">
          <span className="label">
            Demon bluffs — tap to reveal individually
          </span>
          <div className="bluff-reveal-grid">
            {self.bluffs.map((b, i) => {
              const r = lookupOfficialRole(b);
              const open = revealedBluffs.has(i);
              return (
                <button
                  key={`${i}-${b}`}
                  type="button"
                  className={`bluff-reveal-card ${open ? "revealed" : ""}`}
                  onClick={() => {
                    setRevealedBluffs((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                  aria-label={`Bluff ${i + 1}${open ? "" : " — tap to reveal"}`}
                >
                  {open ? (
                    <span className="bluff-reveal-name">
                      {r?.name ?? b}
                    </span>
                  ) : (
                    <>
                      <span className="bluff-reveal-q">?</span>
                      <span className="bluff-reveal-hint">Bluff {i + 1}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Town view — roster, neighbour subtitles, online dot, per-seat private notes
// ---------------------------------------------------------------------------

const TAG_LABEL: Record<Exclude<TownNoteTag, null>, string> = {
  good: "good guess",
  evil: "evil guess",
  unsure: "unsure",
};

function aliveNeighbours(
  publicLobby: PublicLobbyRecord,
  seatId: string
): { left: PlayerPublicRecord | null; right: PlayerPublicRecord | null } {
  const order = publicLobby.seatOrder;
  const idx = order.indexOf(seatId);
  if (idx < 0) return { left: null, right: null };
  const n = order.length;

  const findAlive = (step: 1 | -1): PlayerPublicRecord | null => {
    for (let i = 1; i < n; i++) {
      const j = ((idx + step * i) % n + n) % n;
      const targetId = order[j];
      if (!targetId || targetId === seatId) continue;
      const p = publicLobby.players[targetId];
      if (p && p.alive) return p;
    }
    return null;
  };

  return { left: findAlive(-1), right: findAlive(1) };
}

function TownView({
  publicLobby,
  ownPlayerId,
  code,
}: {
  publicLobby: PublicLobbyRecord | null;
  ownPlayerId: string | null;
  code: string;
}) {
  const townNotes = usePlayerStore((s) => s.townNotes);
  const setTownNote = usePlayerStore((s) => s.setTownNote);
  const [editingSeat, setEditingSeat] = useState<string | null>(null);

  const counts = useMemo(() => {
    if (!publicLobby) return { alive: 0, dead: 0, online: 0, total: 0 };
    let alive = 0, dead = 0, online = 0;
    for (const id of publicLobby.seatOrder) {
      const p = publicLobby.players[id];
      if (!p) continue;
      if (p.alive) alive++;
      else dead++;
      if (p.online) online++;
    }
    return { alive, dead, online, total: publicLobby.seatOrder.length };
  }, [publicLobby]);

  if (!publicLobby) return null;
  const activeFabled = publicLobby.fabled ?? [];
  const activeLorics = publicLobby.lorics ?? [];

  return (
    <div className="town-view">
      {(activeFabled.length > 0 || activeLorics.length > 0) && (
        <div className="town-fabled">
          {activeFabled.length > 0 && <span className="label">Fabled</span>}
          {activeFabled.map((id) => {
            const r = lookupOfficialRole(id);
            return (
              <span key={id} className="fabled-strip-item" title={r?.ability}>
                {r?.name ?? id}
              </span>
            );
          })}
          {activeLorics.length > 0 && <span className="label">Lorics</span>}
          {activeLorics.map((id) => {
            const r = lookupOfficialRole(id);
            return (
              <span key={id} className="loric-strip-item" title={r?.ability}>
                {r?.name ?? id}
              </span>
            );
          })}
        </div>
      )}

      <div className="town-view-header">
        <h3 className="drawer-section-title" style={{ margin: 0 }}>Town</h3>
        <span className="label">{counts.alive}/{counts.total} alive</span>
        <span className="label">{counts.online}/{counts.total} online</span>
      </div>

      <ul className="town-list">
        {publicLobby.seatOrder.map((id) => {
          const p = publicLobby.players[id];
          if (!p) return null;
          const isYou = id === ownPlayerId;
          const { left, right } = aliveNeighbours(publicLobby, id);
          const noteKey = `${code}:${id}`;
          const note = townNotes[noteKey];
          const isEditing = editingSeat === id;

          return (
            <li
              key={id}
              className={`town-row ${p.alive ? "" : "dead"} ${isYou ? "you" : ""} ${
                note?.tag ? `note-tag-${note.tag}` : ""
              }`}
            >
              <button
                type="button"
                className="town-row-main"
                onClick={() => {
                  setEditingSeat((cur) => (cur === id ? null : id));
                }}
                aria-expanded={isEditing}
              >
                <span className="label town-row-seat">seat {p.seat + 1}</span>
                <span className="town-name">
                  {p.name}
                  {isYou && " (you)"}
                </span>
                <span className="town-row-meta">
                  <span
                    className={`town-presence ${p.online ? "online" : "offline"}`}
                    title={p.online ? "Online" : "Offline"}
                    aria-label={p.online ? "Online" : "Offline"}
                  />
                  <span className="label">{p.alive ? "alive" : "dead"}</span>
                  {note?.tag && (
                    <span className={`town-note-chip note-tag-${note.tag}`}>
                      {TAG_LABEL[note.tag]}
                    </span>
                  )}
                </span>
              </button>
              <div className="town-row-neighbours">
                ← {left ? left.name : "—"} · {right ? right.name : "—"} →
              </div>
              {note?.text && !isEditing && (
                <p className="town-row-note">{note.text}</p>
              )}
              {isEditing && !isYou && (
                <NoteEditor
                  initial={note ?? { text: "", tag: null }}
                  onSave={(next) => {
                    setTownNote(code, id, next);
                    setEditingSeat(null);
                  }}
                  onCancel={() => setEditingSeat(null)}
                />
              )}
              {isEditing && isYou && (
                <p className="behavior-help">
                  Notes about your own seat aren't kept — that's just talking to yourself.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="town-legend">
        <span className="label note-tag-good">good guess</span>
        <span className="label note-tag-evil">evil guess</span>
        <span className="label note-tag-unsure">unsure</span>
        <span className="label">tap a seat to add a private note</span>
      </div>
    </div>
  );
}

function NoteEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: TownNote;
  onSave: (next: TownNote | null) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial.text);
  const [tag, setTag] = useState<TownNoteTag>(initial.tag);

  return (
    <div className="town-note-editor">
      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Private note about this seat…"
        rows={2}
      />
      <div className="town-note-tags">
        {(["good", "evil", "unsure"] as Exclude<TownNoteTag, null>[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`toggle-pill note-tag-${t}`}
            aria-pressed={tag === t}
            onClick={() => setTag((cur) => (cur === t ? null : t))}
          >
            {TAG_LABEL[t]}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => onSave(null)}
        >
          clear
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          cancel
        </button>
        <button
          type="button"
          className="btn btn-sm btn-gold"
          onClick={() => onSave({ text, tag })}
        >
          save
        </button>
      </div>
    </div>
  );
}
