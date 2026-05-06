import type { RoleDef } from "@/stores/types";
import { AlmanacBody } from "./AlmanacBody";

type AlmanacProps = {
  title: string;
  roles: RoleDef[];
  onClose: () => void;
};

export function Almanac({ title, roles, onClose }: AlmanacProps) {
  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="dialog dialog-lg" role="dialog" aria-label={title}>
        <header className="dialog-header">
          <h2 className="dialog-title">{title}</h2>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <AlmanacBody roles={roles} autoFocusSearch />
      </div>
    </>
  );
}
