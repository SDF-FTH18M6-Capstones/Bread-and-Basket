// value = units ordered so far, min = target to unlock, max = total units available.
export default function ProgressBar({ value, min, max, label }) {
  const width = Math.min(100, (value / max) * 100);
  const minPosition = (min / max) * 100;
  const reached = value >= min;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className="relative h-[5px] rounded-full bg-[#E4E9E2]"
    >
      <div
        className={`h-full rounded-full ${reached ? "bg-leaf" : "bg-forest"}`}
        style={{ width: `${width}%` }}
      />
      <span
        className="absolute -top-[3px] h-[11px] w-0.5 -translate-x-px rounded-sm bg-orange"
        style={{ left: `${minPosition}%` }}
      />
    </div>
  );
}
