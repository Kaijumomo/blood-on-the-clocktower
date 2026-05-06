import { MIN_PLAYERS, MAX_PLAYERS } from "@/data/setupCounts";

type Props = {
  value: number;
  onChange: (n: number) => void;
};

export function PlayerCountStepper({ value, onChange }: Props) {
  const dec = () => onChange(Math.max(MIN_PLAYERS, value - 1));
  const inc = () => onChange(Math.min(MAX_PLAYERS, value + 1));

  return (
    <div className="ng-stepper">
      <button
        className="btn btn-sm ng-stepper-btn"
        onClick={dec}
        disabled={value <= MIN_PLAYERS}
        aria-label="Fewer players"
      >
        −
      </button>
      <span className="ng-stepper-value" aria-live="polite">
        {value} <span className="ng-stepper-label">players</span>
      </span>
      <button
        className="btn btn-sm ng-stepper-btn"
        onClick={inc}
        disabled={value >= MAX_PLAYERS}
        aria-label="More players"
      >
        +
      </button>
    </div>
  );
}
