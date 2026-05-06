import { iconUrlFor } from "@/data/iconUrl";
import type { TownNote, TownNoteConfidence } from "@/stores/playerStore";
import type { RoleDef } from "@/stores/types";

export const CONFIDENCE_LABEL: Record<TownNoteConfidence, string> = {
  suspect: "SUSPECT",
  likely: "LIKELY",
  confirm: "CONFIRM",
};

export const CONFIDENCE_CLASS: Record<TownNoteConfidence, string> = {
  suspect: "sn-suspect",
  likely: "sn-likely",
  confirm: "sn-confirm",
};

type Props = {
  note: TownNote;
  roleById: Map<string, RoleDef>;
};

export function SeatNotePreview({ note, roleById }: Props) {
  if (!note.confidence && note.roles.length === 0) return null;

  return (
    <div className="sn-preview">
      {note.roles.map((id) => {
        const role = roleById.get(id);
        return (
          <span
            key={id}
            className={`sn-preview-token ${note.confidence ? CONFIDENCE_CLASS[note.confidence] : ""}`}
            title={role?.name ?? id}
          >
            <img
              className="sn-preview-art"
              src={iconUrlFor(role ?? id)}
              alt={role?.name ?? id}
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </span>
        );
      })}
      {note.confidence && (
        <span className={`sn-preview-confidence ${CONFIDENCE_CLASS[note.confidence]}`}>
          {CONFIDENCE_LABEL[note.confidence]}
        </span>
      )}
    </div>
  );
}
