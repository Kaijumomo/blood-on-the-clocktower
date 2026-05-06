import { useState } from "react";
import { iconUrlFor } from "@/data/iconUrl";
import { CONFIDENCE_LABEL, CONFIDENCE_CLASS } from "./SeatNotePreview";
import type { TownNote, TownNoteConfidence } from "@/stores/playerStore";
import type { RoleDef, RoleId } from "@/stores/types";

const CONFIDENCES: TownNoteConfidence[] = ["suspect", "likely", "confirm"];
const MAX_ROLES = 3;

type Props = {
  playerName: string;
  scriptCharacters: RoleDef[];
  note: TownNote | null;
  onSave: (note: TownNote | null) => void;
  onClose: () => void;
};

export function SeatNotePopup({
  playerName,
  scriptCharacters,
  note,
  onSave,
  onClose,
}: Props) {
  const [confidence, setConfidence] = useState<TownNoteConfidence | null>(
    note?.confidence ?? null
  );
  const [roles, setRoles] = useState<RoleId[]>(note?.roles ?? []);
  const [text, setText] = useState(note?.text ?? "");
  const [shakingId, setShakingId] = useState<RoleId | null>(null);

  const toggleConfidence = (c: TownNoteConfidence) => {
    if (confidence === c) {
      setConfidence(null);
    } else {
      setConfidence(c);
      setRoles([]); // reset token selections when switching confidence level
    }
  };

  const toggleRole = (id: RoleId) => {
    if (roles.includes(id)) {
      setRoles((prev) => prev.filter((r) => r !== id));
      return;
    }
    if (roles.length >= MAX_ROLES) {
      // Shake animation to signal cap
      setShakingId(id);
      setTimeout(() => setShakingId(null), 400);
      return;
    }
    setRoles((prev) => [...prev, id]);
  };

  const handleSave = () => {
    const next: TownNote = { confidence, roles, text };
    const isEmpty =
      confidence === null && roles.length === 0 && text.trim().length === 0;
    onSave(isEmpty ? null : next);
    onClose();
  };

  const handleClear = () => {
    onSave(null);
    onClose();
  };

  return (
    <>
      <div className="sn-backdrop" onClick={onClose} />
      <div className="sn-popup" role="dialog" aria-label={`Notes for ${playerName}`}>
        {/* Header */}
        <div className="sn-popup-header">
          <button className="btn btn-sm sn-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <h3 className="sn-popup-title">Notes for {playerName}</h3>
        </div>

        <div className="sn-popup-body">
          {/* Confidence pills */}
          <div className="sn-confidence-pills">
            {CONFIDENCES.map((c) => (
              <button
                key={c}
                type="button"
                className={`sn-pill sn-pill-${c}${confidence === c ? " active" : ""}`}
                onClick={() => toggleConfidence(c)}
                aria-pressed={confidence === c}
              >
                {CONFIDENCE_LABEL[c]}
              </button>
            ))}
          </div>

          {/* Role counter */}
          <div className="sn-roles-header">
            <span className="sn-roles-label">Role guesses</span>
            <span className={`sn-roles-count ${roles.length >= MAX_ROLES ? "at-max" : ""}`}>
              {roles.length}/{MAX_ROLES}
            </span>
          </div>

          {/* Character grid */}
          {scriptCharacters.length > 0 ? (
            <div className="sn-char-grid">
              {scriptCharacters.map((role) => {
                const selected = roles.includes(role.id);
                const disabled = !selected && roles.length >= MAX_ROLES;
                const shaking = shakingId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    className={[
                      "sn-char-tile",
                      selected ? "selected" : "",
                      disabled ? "disabled" : "",
                      shaking ? "shake" : "",
                      confidence ? CONFIDENCE_CLASS[confidence] : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => toggleRole(role.id)}
                    aria-pressed={selected}
                    title={role.ability ?? role.name}
                  >
                    <img
                      className="sn-char-art"
                      src={iconUrlFor(role)}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    <span className="sn-char-name">{role.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="behavior-help sn-no-script">
              Script characters unavailable for custom scripts. Use the text
              note below.
            </p>
          )}

          {/* Text note */}
          <textarea
            className="textarea sn-text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quick note… (optional)"
            rows={2}
          />
        </div>

        {/* Footer */}
        <div className="sn-popup-footer">
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-gold sn-save-btn"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
