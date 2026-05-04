import { useEffect, useMemo, useRef, useState } from "react";
import { useStorytellerStore, selectScriptById } from "@/stores/storytellerStore";
import { ringRadius, seatPosition, tokenSizeForCount } from "./layout";
import { TRAVELERS } from "@/data/travelers";
import { iconUrlFor } from "@/data/iconUrl";
import type { RoleDef, Script, STPlayerRecord } from "@/stores/types";

export function buildRoleDisplayMap(script: Script | undefined): Map<string, RoleDef> {
  const map = new Map((script?.characters ?? []).map((c) => [c.id, c]));
  for (const t of TRAVELERS) map.set(t.id, t);
  return map;
}

const STATUS_KINDS = ["drunk", "poisoned", "protected"] as const;
const DRAG_MIME = "application/x-new-blood-seat";

type TokenProps = {
  player: STPlayerRecord;
  role: RoleDef | undefined;
  shownRole: RoleDef | undefined;
  online: boolean | undefined;
  size: number;
  x: number;
  y: number;
  selected: boolean;
  draggedId: string | null;
  onClick: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropOn: (targetId: string) => void;
};

function Token({
  player,
  role,
  shownRole,
  online,
  size,
  x,
  y,
  selected,
  draggedId,
  onClick,
  onDragStart,
  onDragEnd,
  onDropOn,
}: TokenProps) {
  const displayRole = shownRole ?? role;
  const hasDeception =
    player.behaviorMode !== "normal" ||
    (!!player.shownRole && player.shownRole !== player.actualRole);
  const isDragSource = draggedId === player.id;
  const isDragTarget = draggedId !== null && draggedId !== player.id;
  return (
    <div
      className={[
        "token",
        !player.alive ? "dead" : "",
        hasDeception ? "deception" : "",
        selected ? "selected" : "",
        isDragSource ? "dragging" : "",
        isDragTarget ? "drag-target" : "",
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
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(DRAG_MIME, player.id);
        onDragStart(player.id);
      }}
      onDragEnd={() => onDragEnd()}
      onDragOver={(e) => {
        if (draggedId && draggedId !== player.id) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(e) => {
        const sourceId =
          e.dataTransfer.getData(DRAG_MIME) || draggedId;
        if (sourceId && sourceId !== player.id) {
          e.preventDefault();
          onDropOn(player.id);
        }
      }}
    >
      <div
        className="token-disc"
        style={{ width: size, height: size }}
      >
        {displayRole?.iconUrl !== undefined || displayRole ? (
          <img
            className="token-art"
            src={iconUrlFor(displayRole ?? player.actualRole)}
            alt=""
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
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
        {online === false && (
          <span
            className="token-presence offline"
            title="Offline"
            aria-label="Offline"
          />
        )}
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

type Props = {
  online?: Record<string, boolean>;
};

export function GrimoireCircle({ online }: Props = {}) {
  const game = useStorytellerStore((s) => s.game);
  const script = useStorytellerStore((s) =>
    game ? selectScriptById(s, game.scriptId) : undefined
  );
  const selectedPlayerId = useStorytellerStore((s) => s.selectedPlayerId);
  const selectPlayer = useStorytellerStore((s) => s.selectPlayer);
  const addPlayer = useStorytellerStore((s) => s.addPlayer);
  const setSeatOrder = useStorytellerStore((s) => s.setSeatOrder);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(680);
  const [draggedId, setDraggedId] = useState<string | null>(null);

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

  const roleById = useMemo(() => buildRoleDisplayMap(script), [script]);

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
                online={online?.[id]}
                size={tokenSize}
                x={pos.x}
                y={pos.y}
                selected={selectedPlayerId === id}
                draggedId={draggedId}
                onClick={() => selectPlayer(id)}
                onDragStart={(srcId) => setDraggedId(srcId)}
                onDragEnd={() => setDraggedId(null)}
                onDropOn={(targetId) => {
                  const src = draggedId;
                  setDraggedId(null);
                  if (!src || src === targetId) return;
                  const order = [...game.seatOrder];
                  const i = order.indexOf(src);
                  const j = order.indexOf(targetId);
                  if (i < 0 || j < 0) return;
                  // Move source out, insert before target so the dropped seat
                  // takes the target seat's position.
                  order.splice(i, 1);
                  const insertAt = order.indexOf(targetId);
                  if (insertAt < 0) return;
                  order.splice(insertAt, 0, src);
                  setSeatOrder(order);
                }}
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
