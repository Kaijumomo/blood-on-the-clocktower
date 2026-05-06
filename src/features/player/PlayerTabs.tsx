type PlayerTab = "role" | "town" | "almanac";

type Props = {
  active: PlayerTab;
  onChange: (tab: PlayerTab) => void;
};

const TABS: { id: PlayerTab; label: string }[] = [
  { id: "role", label: "Role" },
  { id: "town", label: "Town" },
  { id: "almanac", label: "Almanac" },
];

export function PlayerTabs({ active, onChange }: Props) {
  return (
    <nav className="player-tabs" aria-label="Player views">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          className="player-tab"
          aria-pressed={active === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
