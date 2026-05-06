import { SETUP_COUNTS, MIN_PLAYERS, MAX_PLAYERS } from "@/data/setupCounts";

type Props = {
  selected: number;
  onSelect: (count: number) => void;
};

const HEADERS = ["Players", "Townsfolk", "Outsiders", "Minions", "Demons"];

export function PlayerCountTable({ selected, onSelect }: Props) {
  const counts = [];
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    counts.push({ n, ...SETUP_COUNTS[n]! });
  }

  return (
    <table className="ng-count-table" aria-label="Player count reference">
      <thead>
        <tr>
          {HEADERS.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {counts.map(({ n, townsfolk, outsider, minion, demon }) => (
          <tr
            key={n}
            className={n === selected ? "ng-count-row selected" : "ng-count-row"}
            onClick={() => onSelect(n)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(n);
              }
            }}
            aria-selected={n === selected}
          >
            <td className="ng-count-players">{n}</td>
            <td className="ng-count-tf">{townsfolk}</td>
            <td className="ng-count-out">{outsider}</td>
            <td className="ng-count-min">{minion}</td>
            <td className="ng-count-dem">{demon}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
