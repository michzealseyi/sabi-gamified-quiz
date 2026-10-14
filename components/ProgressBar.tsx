export default function ProgressBar({ pct, label }: { pct: number; label: string }) {
  const value = Math.min(Math.max(pct, 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-5 w-full overflow-hidden rounded-full border-2 border-ink bg-white"
    >
      <div
        className="h-full rounded-full bg-gold transition-[width] duration-700 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
