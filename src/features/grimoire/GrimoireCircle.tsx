import { useEffect, useMemo, useRef, useState } from "react";
import { useStorytellerStore, selectScriptById } from "@/stores/storytellerStore";
import { ringRadius, seatPosition, tokenSizeForCount } from "./layout";
import type { RoleDef, STPlayerRecord } from "@/stores/types";

const STATUS_KINDS = ["drunk", "poisoned", "protected"] as const;

type TokenProps = {
  player: STPlayerRecord;
  role: RoleDef | undefined;
  shownRole: RoleDef | undefined;
  size: number;
  x: number;
  y: number;
  selected: boolean;
  onClick: () => void;
};

function Token({ player, role, shownRole, size, x, y, selected, onClick }: TokenProps) {
  const displayRole = shownRole ?? role;
  const hasDeception =
    player.behaviorMode !== "normal" ||
    (!!player.shownRole && player.shownRole !== player.actualRole);
  return (
    <div
      className={[
        "token",
        !player.alive ? "dead" : "",
        hasDeception ? "deception" : "",
        selected ? "selected" : "",
      ].filter(Boolean).join(" ")}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className="token-disc"
        style={{ width: size, height: size }}
      >
        {displayRole ? (
          <div className={`token-role type-${displayRole.type}`}>
            {displayRole.name}
          </div>
        ) : (
          <div className="token-role unassigned">unassigned</div>
        )}
        <div className="token-statuses">
          {STATUS_KINDS.filter((k) => player.statuses[k]).map((k) => (
            <span key={k} className="status-chip" data-kind={k} title={k}>
              {k[0]!.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      <div className="token-name">{player.name}</div>
      {!player.alive && (
        <div className="token-ghost">
          {player.ghostVote ? "ghost vote" : "voted"}
        </div>
      )}
      {player.reminders.length > 0 && (
        <div className="token-reminders">
          {player.reminders.slice(0, 4).map((r, i) => (
            <span key={i} className="reminder-pip">
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function GrimoireCircle() {
  const game = useStorytellerStore((s) => s.game);
  const script = useStorytellerStore((s) =>
    game ? selectScriptById(s, game.scriptId) : undefined
  );
  const selectedPlayerId = useStorytellerStore((s) => s.selectedPlayerId);
  const selectPlayer = useStorytellerStore((s) => s.selectPlayer);
  const addPlayer = useStorytellerStore((s) => s.addPlayer);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(680);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        const s = Math.min(entry.contentRect.width, entry.contentRect.height);
        setSize(s);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const roleById = useMemo(
    () => new Map((script?.characters ?? []).map((c) => [c.id, c])),
    [script]
  );

  if (!game || !script) return null;

  const playerCount = game.seatOrder.length;
  const tokenSize = tokenSizeForCount(playerCount);
  const radius = ringRadius(size, tokenSize);

  const handleAdd = () => {
    const name = window.prompt("Player name?");
    if (name?.trim()) addPlayer(name);
  };

  return (
    <div className="grimoire-wrap">
      <div className="grimoire" ref={wrapRef}>
        <div className="grimoire-ring outer" />
        <div className="grimoire-ring inner" />
        {playerCount === 0 ? (
          <div className="grimoire-empty">
            <p>Add players to begin.</p>
            <button className="btn btn-gold" onClick={handleAdd}>
              + Add player
            </button>
          </div>
        ) : (
          game.seatOrder.map((id, i) => {
            const p = game.players[id];
            if (!p) return null;
            const pos = seatPosition(i, playerCount, radius);
            return (
              <Token
                key={id}
                player={p}
                role={p.actualRole ? roleById.get(p.actualRole) : undefined}
                shownRole={p.shownRole ? roleById.get(p.shownRole) : undefined}
                size={tokenSize}
                x={pos.x}
                y={pos.y}
                selected={selectedPlayerId === id}
                onClick={() => selectPlayer(id)}
              />
            );
          })
        )}
        {playerCount > 0 && (
          <button
            className="add-player-btn"
            onClick={handleAdd}
            aria-label="Add player"
            title="Add player"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
