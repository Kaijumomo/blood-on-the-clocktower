import { lookupOfficialRole } from "@/data/officialRoles";
import { iconUrlFor } from "@/data/iconUrl";
import type { PlayerPublicRecord } from "@/stores/types";

type Props = {
  player: PlayerPublicRecord;
  size: number;
  x: number;
  y: number;
};

export function PublicSeat({ player, size, x, y }: Props) {
  const role = player.publicDisplayRole
    ? lookupOfficialRole(player.publicDisplayRole)
    : null;
  return (
    <div
      className={`public-seat ${player.alive ? "alive" : "dead"} ${player.online ? "" : "offline"}`}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
      }}
    >
      <div className="public-seat-disc" style={{ width: size, height: size }}>
        {role && (
          <img
            className="public-seat-art"
            src={iconUrlFor(role)}
            alt=""
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <span className="public-seat-num">{player.seat + 1}</span>
        <div className="public-seat-name">{player.name}</div>
        {role && <div className="public-seat-role">{role.name}</div>}
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
      {player.isTraveler && <div className="public-seat-traveler">traveler</div>}
    </div>
  );
}
