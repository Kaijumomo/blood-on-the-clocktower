import { useStorytellerStore } from "@/stores/storytellerStore";
import { seatPlayer } from "@/firebase/lobby";
import type { RoomBackend } from "@/firebase/backend";
import type { PlayerId } from "@/stores/types";

type Props = {
  seatPlayerId: PlayerId;
  seatNumber: number;
  backend: RoomBackend | null;
  code: string;
  onClose: () => void;
};

export function SeatAssignPopup({ seatPlayerId, seatNumber, backend, code, onClose }: Props) {
  const pendingPlayers = useStorytellerStore((s) => s.game?.pendingPlayers ?? {});
  const assignPendingToSeat = useStorytellerStore((s) => s.assignPendingToSeat);
  const removePendingPlayer = useStorytellerStore((s) => s.removePendingPlayer);

  const entries = Object.entries(pendingPlayers);

  const handleAssign = async (uid: string) => {
    const ok = assignPendingToSeat(uid, seatPlayerId);
    if (!ok) return;
    if (backend && code) {
      try {
        await seatPlayer(backend, code, uid, seatPlayerId, null);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[SeatAssignPopup] seatPlayer failed:", e instanceof Error ? e.message : e);
      }
    }
    onClose();
  };

  const handleReject = (uid: string) => {
    removePendingPlayer(uid);
  };

  return (
    <>
      <div className="seat-assign-backdrop" onClick={onClose} />
      <div className="seat-assign-popup" role="dialog" aria-label={`Assign player to seat ${seatNumber}`}>
        <div className="seat-assign-header">
          <span className="seat-assign-title">Assign to Seat {seatNumber}</span>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {entries.length === 0 ? (
          <p className="seat-assign-empty">No players waiting yet.</p>
        ) : (
          <ul className="seat-assign-list">
            {entries.map(([uid, name]) => (
              <li key={uid} className="seat-assign-row">
                <span className="seat-assign-name">{name}</span>
                <div className="seat-assign-actions">
                  <button className="btn btn-sm btn-gold" onClick={() => handleAssign(uid)}>
                    Assign
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleReject(uid)}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
