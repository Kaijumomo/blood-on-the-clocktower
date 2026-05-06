import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorytellerStore, selectScriptById } from "@/stores/storytellerStore";
import { ringRadius, seatPosition, tokenSizeForCount } from "./layout";
import { TRAVELERS } from "@/data/travelers";
import { iconUrlFor } from "@/data/iconUrl";
import type { GrimoireMode, PlayerId, RoleDef, Script, STPlayerRecord } from "@/stores/types";

export function buildRoleDisplayMap(script: Script | undefined): Map<string, RoleDef> {
  const map = new Map((script?.characters ?? []).map((c) => [c.id, c]));
  for (const t of TRAVELERS) map.set(t.id, t);
  return map;
}

const STATUS_KINDS = ["drunk", "poisoned", "protected"] as const;

const STATUS_ICON: Record<typeof STATUS_KINDS[number], React.ReactNode> = {
  drunk: (
    <svg viewBox="0 0 16 16" fill="none" strokeLinecap="round" width="70%" height="70%" aria-hidden>
      <path d="M8 2a6 6 0 1 0 6 6" stroke="white" strokeWidth="1.8" />
      <path d="M8 5a3 3 0 1 0 3 3" stroke="white" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.2" fill="white" />
    </svg>
  ),
  poisoned: (
    <svg viewBox="0 0 16 16" fill="white" width="62%" height="62%" aria-hidden>
      <path d="M8 2C8 2 3.5 8 3.5 11A4.5 4.5 0 0 0 12.5 11C12.5 8 8 2 8 2Z" />
    </svg>
  ),
  protected: (
    <svg viewBox="0 0 16 16" fill="white" width="68%" height="68%" aria-hidden>
      <path d="M8 2L2.5 4.5V9.5C2.5 12.5 4.8 14.5 8 15.5C11.2 14.5 13.5 12.5 13.5 9.5V4.5L8 2Z" />
    </svg>
  ),
};

const DRAG_MIME = "application/x-new-blood-seat";
const FREE_ROAM_TOKEN_SIZE = 100;
const TAP_MAX_PX = 6;
const TAP_MAX_MS = 200;

type DragState = {
  id: PlayerId;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  startTime: number;
};

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

type TokenProps = {
  player: STPlayerRecord;
  role: RoleDef | undefined;
  shownRole: RoleDef | undefined;
  online: boolean | undefined;
  size: number;
  x: number;
  y: number;
  selected: boolean;
  mode: GrimoireMode;
  draggedId: string | null;
  onRingDragStart: (id: string) => void;
  onRingDragEnd: () => void;
  onRingDropOn: (targetId: string) => void;
  onFreeRoamPointerDown: (e: React.PointerEvent, id: string, x: number, y: number) => void;
  onClick: () => void;
  isGhost?: boolean;
};

function Token({
  player, role, shownRole, online, size, x, y, selected,
  mode, draggedId, onRingDragStart, onRingDragEnd, onRingDropOn,
  onFreeRoamPointerDown, onClick, isGhost = false,
}: TokenProps) {
  const displayRole = shownRole ?? role;
  const hasDeception =
    player.behaviorMode !== "normal" ||
    (!!player.shownRole && player.shownRole !== player.actualRole);
  const isDragSource = draggedId === player.id;
  const isDragTarget = draggedId !== null && draggedId !== player.id;

  const classes = [
    "token",
    !player.alive ? "dead" : "",
    hasDeception ? "deception" : "",
    selected ? "selected" : "",
    isDragSource ? "dragging" : "",
    isDragTarget ? "drag-target" : "",
    isGhost ? "ghost" : "",
    mode === "freeRoam" ? "free-roam" : "",
  ].filter(Boolean).join(" ");

  const ringDragHandlers = mode === "ring" ? {
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(DRAG_MIME, player.id);
      onRingDragStart(player.id);
    },
    onDragEnd: () => onRingDragEnd(),
    onDragOver: (e: React.DragEvent) => {
      if (draggedId && draggedId !== player.id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    },
    onDrop: (e: React.DragEvent) => {
      const sourceId = e.dataTransfer.getData(DRAG_MIME) || draggedId;
      if (sourceId && sourceId !== player.id) {
        e.preventDefault();
        onRingDropOn(player.id);
      }
    },
  } : {};

  const freeRoamHandlers = mode === "freeRoam" && !isGhost ? {
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      onFreeRoamPointerDown(e, player.id, x, y);
    },
  } : {};

  return (
    <div
      className={classes}
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
      onClick={isGhost ? undefined : onClick}
      role="button"
      tabIndex={isGhost ? -1 : 0}
      onKeyDown={(e) => {
        if (!isGhost && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      {...ringDragHandlers}
      {...freeRoamHandlers}
    >
      <div className="token-disc-frame" style={{ width: size, height: size }}>
        <div className="token-disc" style={{ width: size, height: size }}>
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
          {online === false && (
            <span className="token-presence offline" title="Offline" aria-label="Offline" />
          )}
        </div>
        {STATUS_KINDS.filter((k) => player.statuses[k]).map((k) => (
          <span key={k} className={`status-chip status-chip-${k}`} title={k}>
            {STATUS_ICON[k]}
          </span>
        ))}
      </div>
      {displayRole ? (
        <div className={`token-role type-${displayRole.type}`}>{displayRole.name}</div>
      ) : (
        <div className="token-role unassigned">unassigned</div>
      )}
      <div className="token-name">{player.name}</div>
      {mode === "ring" && (
        <div className="token-seat-num">seat {player.seat + 1}</div>
      )}
      {!player.alive && (
        <div className="token-ghost">
          {player.ghostVote ? "ghost vote" : "voted"}
        </div>
      )}
      {player.reminders.length > 0 && (
        <div className="token-reminders">
          {player.reminders.slice(0, 4).map((r, i) => (
            <span key={i} className="reminder-pip">{r}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GrimoireCircle
// ---------------------------------------------------------------------------

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
  const grimoireMode = useStorytellerStore((s) => s.grimoireMode);
  const tokenPositions = useStorytellerStore((s) => s.tokenPositions);
  const setGrimoireMode = useStorytellerStore((s) => s.setGrimoireMode);
  const setTokenPosition = useStorytellerStore((s) => s.setTokenPosition);
  const clearTokenPositions = useStorytellerStore((s) => s.clearTokenPositions);

  const canvasRef = useRef<HTMLDivElement>(null);
  // Track width + height separately so free-roam uses the full rectangle.
  const [canvasW, setCanvasW] = useState(680);
  const [canvasH, setCanvasH] = useState(680);
  const [ringDraggedId, setRingDraggedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setCanvasW(entry.contentRect.width);
        setCanvasH(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const roleById = useMemo(() => buildRoleDisplayMap(script), [script]);

  if (!game || !script) return null;

  const playerCount = game.seatOrder.length;
  // Ring mode uses the square minimum for layout (unchanged behaviour).
  const ringContainerSize = Math.min(canvasW, canvasH);
  const ringTokenSize = tokenSizeForCount(playerCount);
  const radius = ringRadius(ringContainerSize, ringTokenSize);
  const tokenSize = grimoireMode === "freeRoam" ? FREE_ROAM_TOKEN_SIZE : ringTokenSize;

  // Rectangular clamp — each axis bounded independently by the full canvas.
  const half = tokenSize / 2;
  const maxX = canvasW / 2 - half;
  const maxY = canvasH / 2 - half;
  const clampX = (v: number) => Math.max(-maxX, Math.min(maxX, v));
  const clampY = (v: number) => Math.max(-maxY, Math.min(maxY, v));

  const getPos = (id: PlayerId, seatIndex: number) => {
    const ring = seatPosition(seatIndex, playerCount, radius);
    if (grimoireMode === "freeRoam") return tokenPositions[id] ?? ring;
    return ring;
  };

  const switchToFreeRoam = () => {
    game.seatOrder.forEach((id, i) => {
      if (!tokenPositions[id]) {
        const pos = seatPosition(i, playerCount, radius);
        setTokenPosition(id, pos.x, pos.y);
      }
    });
    setGrimoireMode("freeRoam");
  };

  const handleAdd = () => {
    const name = window.prompt("Player name?");
    if (name?.trim()) addPlayer(name);
  };

  // ── Free-roam pointer drag ────────────────────────────────────────────────

  const handleTokenPointerDown = useCallback(
    (e: React.PointerEvent, id: PlayerId, tokenX: number, tokenY: number) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setDrag({
        id,
        offsetX: e.clientX - cx - tokenX,
        offsetY: e.clientY - cy - tokenY,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startTime: Date.now(),
      });
      setGhostPos({ x: tokenX, y: tokenY });
    },
    []
  );

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!drag || grimoireMode !== "freeRoam") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setGhostPos({
      x: clampX(e.clientX - cx - drag.offsetX),
      y: clampY(e.clientY - cy - drag.offsetY),
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (!drag || grimoireMode !== "freeRoam") return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - drag.startTime;
    if (dist < TAP_MAX_PX && elapsed < TAP_MAX_MS) {
      selectPlayer(drag.id);
    } else if (ghostPos) {
      setTokenPosition(drag.id, ghostPos.x, ghostPos.y);
    }
    setDrag(null);
    setGhostPos(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const modeControls = (
    <div className="grimoire-mode-controls">
      {grimoireMode === "ring" ? (
        <button className="grimoire-mode-btn" onClick={switchToFreeRoam} title="Switch to free-roam layout">
          ⊞ Free Roam
        </button>
      ) : (
        <>
          <button
            className="grimoire-mode-btn"
            onClick={() => setGrimoireMode("ring")}
            title="Switch back to ring layout"
          >
            ⊙ Ring
          </button>
          <button
            className="grimoire-mode-btn grimoire-snap-btn"
            onClick={() => { clearTokenPositions(); setGrimoireMode("ring"); }}
            title="Reset all token positions to ring"
          >
            ↺ Snap to ring
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="grimoire-wrap">
      <div
        className="grimoire"
        data-mode={grimoireMode}
        ref={canvasRef}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={() => { setDrag(null); setGhostPos(null); }}
      >
        {grimoireMode === "ring" && (
          <>
            <div className="grimoire-ring outer" />
            <div className="grimoire-ring inner" />
          </>
        )}

        {playerCount === 0 ? (
          <div className="grimoire-empty">
            <p>Add players to begin.</p>
            <button className="btn btn-gold" onClick={handleAdd}>+ Add player</button>
          </div>
        ) : (
          game.seatOrder.map((id, i) => {
            const p = game.players[id];
            if (!p) return null;
            const pos = getPos(id, i);
            const isDragging = drag?.id === id;
            return (
              <Token
                key={id}
                player={p}
                role={p.actualRole ? roleById.get(p.actualRole) : undefined}
                shownRole={p.shownRole ? roleById.get(p.shownRole) : undefined}
                online={online?.[id]}
                size={tokenSize}
                x={isDragging && ghostPos ? ghostPos.x : pos.x}
                y={isDragging && ghostPos ? ghostPos.y : pos.y}
                selected={selectedPlayerId === id}
                mode={grimoireMode}
                draggedId={ringDraggedId}
                onRingDragStart={(srcId) => setRingDraggedId(srcId)}
                onRingDragEnd={() => setRingDraggedId(null)}
                onRingDropOn={(targetId) => {
                  const src = ringDraggedId;
                  setRingDraggedId(null);
                  if (!src || src === targetId) return;
                  const order = [...game.seatOrder];
                  const si = order.indexOf(src);
                  const ti = order.indexOf(targetId);
                  if (si < 0 || ti < 0) return;
                  order.splice(si, 1);
                  const insertAt = order.indexOf(targetId);
                  if (insertAt < 0) return;
                  order.splice(insertAt, 0, src);
                  setSeatOrder(order);
                }}
                onFreeRoamPointerDown={handleTokenPointerDown}
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

      {/* Mode controls live outside the grimoire canvas so they never overlap tokens */}
      {modeControls}
    </div>
  );
}
