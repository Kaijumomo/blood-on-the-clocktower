import { listBuiltinScripts, BUILTIN_SCRIPT_IDS } from "@/data/scripts";
import type { Script } from "@/stores/types";

type Props = {
  customScripts: Record<string, Script>;
  selectedId: string | "import";
  onSelect: (id: string | "import") => void;
};

export function ScriptTabs({ customScripts, selectedId, onSelect }: Props) {
  const builtins = listBuiltinScripts();
  const customs = Object.values(customScripts).filter(
    (s) => !BUILTIN_SCRIPT_IDS.has(s.id)
  );

  return (
    <div className="ng-script-tabs">
      {builtins.map((s) => (
        <button
          key={s.id}
          className={`ng-script-tab${selectedId === s.id ? " active" : ""}`}
          onClick={() => onSelect(s.id)}
          aria-pressed={selectedId === s.id}
        >
          {s.name}
        </button>
      ))}
      {customs.map((s) => (
        <button
          key={s.id}
          className={`ng-script-tab ng-script-tab-custom${selectedId === s.id ? " active" : ""}`}
          onClick={() => onSelect(s.id)}
          aria-pressed={selectedId === s.id}
        >
          {s.name}
          <span className="home-script-tag"> custom</span>
        </button>
      ))}
      <button
        className={`ng-script-tab${selectedId === "import" ? " active" : ""}`}
        onClick={() => onSelect("import")}
        aria-pressed={selectedId === "import"}
      >
        + Import
      </button>
    </div>
  );
}
