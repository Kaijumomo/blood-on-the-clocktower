import { lookupOfficialRole } from "@/data/officialRoles";
import { iconUrlFor } from "@/data/iconUrl";
import type { PlayerPublicRecord } from "@/stores/types";

type Props = {
  player: PlayerPublicRecord;
  size: number;
  x: number;
  y: number;
};

function CandleIcon() {
  return (
    <svg className="public-seat-state-icon" viewBox="0 0 24 36" aria-hidden fill="none">
      {/* Wick */}
      <line x1="12" y1="26" x2="12" y2="31" stroke="rgba(196,158,80,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Outer flame */}
      <path
        d="M12 4C12 4 6 12 6 20C6 24.4 8.7 27 12 27C15.3 27 18 24.4 18 20C18 12 12 4 12 4Z"
        fill="rgba(196,158,80,0.38)"
      />
      {/* Inner glow */}
      <path
        d="M12 11C12 11 9 16.5 9 20C9 22.2 10.3 24 12 24C13.7 24 15 22.2 15 20C15 16.5 12 11 12 11Z"
        fill="rgba(255,220,110,0.28)"
      />
    </svg>
  );
}

function ShroudIcon() {
  return (
    <svg className="public-seat-state-icon" viewBox="0 0 32 40" aria-hidden>
      {/* Shroud body — rounded head, scalloped hem */}
      <path
        d="M6 18C6 9 10 4 16 4C22 4 26 9 26 18L26 35L23 32L20 35L17 32L16 34L15 32L12 35L9 32L6 35Z"
        fill="rgba(200,190,165,0.35)"
      />
      {/* Eye holes */}
      <ellipse cx="12" cy="19" rx="2.5" ry="2.8" fill="rgba(0,0,0,0.25)" />
      <ellipse cx="20" cy="19" rx="2.5" ry="2.8" fill="rgba(0,0,0,0.25)" />
    </svg>
  );
}

function GhostVoteIcon() {
  return (
    <svg className="public-seat-state-icon" viewBox="0 0 32 32" aria-hidden>
      {/* Coin ring */}
      <circle cx="16" cy="16" r="14.5" stroke="rgba(196,158,80,0.75)" strokeWidth="1.5" fill="rgba(8,6,2,0.35)" />
      {/* Ghost body */}
      <path
        d="M9 16C9 11 12 8 16 8C20 8 23 11 23 16L23 24L21 22.5L19 24L17 22.5L16 23.5L15 22.5L13 24L11 22.5L9 24Z"
        fill="rgba(196,158,80,0.72)"
      />
      {/* Ghost eyes */}
      <circle cx="13.5" cy="16" r="1.3" fill="rgba(6,4,2,0.6)" />
      <circle cx="18.5" cy="16" r="1.3" fill="rgba(6,4,2,0.6)" />
    </svg>
  );
}

export function PublicSeat({ player, size, x, y }: Props) {
  const role = player.publicDisplayRole
    ? lookupOfficialRole(player.publicDisplayRole)
    : null;

  const stateIcon = !player.alive && player.ghostVote
    ? <GhostVoteIcon />
    : !player.alive
    ? <ShroudIcon />
    : <CandleIcon />;

  return (
    <div
      className={`public-seat ${player.alive ? "alive" : "dead"} ${player.online ? "" : "offline"}`}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      <div className={`public-seat-disc${role ? "" : " empty"}`} style={{ width: size, height: size }}>
        {role ? (
          <img
            className="public-seat-art"
            src={iconUrlFor(role)}
            alt=""
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : stateIcon}
        <span className="public-seat-num">{player.seat + 1}</span>
        {!player.alive && (
          <div className="public-seat-ghost">
            {player.ghostVote ? "ghost vote" : "voted"}
          </div>
        )}
        {!player.online && (
          <span
            className="public-seat-offline"
            title="Offline"
            aria-label="Offline"
          />
        )}
      </div>
      <div className="public-seat-name">{player.name}</div>
      {role && <div className="public-seat-role">{role.name}</div>}
      {player.isTraveler && <div className="public-seat-traveler">traveler</div>}
    </div>
  );
}
