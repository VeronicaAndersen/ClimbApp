interface TombolaStatsProps {
  total: number;
  remaining: number;
  winners: number;
}

const STATS = [
  { label: "Totalt", field: "total", border: "border-blue-400" },
  { label: "Kvar", field: "remaining", border: "border-emerald-400" },
  { label: "Vinnare", field: "winners", border: "border-yellow-400" },
] as const;

export function TombolaStats(counts: TombolaStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {STATS.map(({ label, field, border }) => (
        <div
          key={field}
          className={`bg-card rounded-xl shadow-sm p-4 text-center border-t-4 ${border}`}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-foreground">{counts[field]}</p>
        </div>
      ))}
    </div>
  );
}
