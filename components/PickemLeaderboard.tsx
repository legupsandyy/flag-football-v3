import type { BoardRow } from "@/lib/pickemData";

export default function PickemLeaderboard({
  rows,
  meId,
  extraLabel,
}: {
  rows: BoardRow[];
  meId: string;
  extraLabel?: string;
}) {
  if (rows.length === 0) {
    return <div className="border border-grid bg-panel px-4 py-3 text-sm text-black/40">No one has joined yet.</div>;
  }
  // Tied people share a rank number.
  let lastPoints: number | null = null;
  let lastRank = 0;
  const ranked = rows.map((r, i) => {
    if (r.points !== lastPoints) {
      lastRank = i + 1;
      lastPoints = r.points;
    }
    return { ...r, rank: lastRank };
  });

  return (
    <div className="border border-grid bg-panel">
      <div className="flex items-center px-4 py-2 row-line font-mono text-[11px] uppercase tracking-wide text-black/40">
        <span className="w-8">#</span>
        <span className="flex-1">name</span>
        {extraLabel && <span className="w-24 text-right pr-3">{extraLabel}</span>}
        <span className="w-20 text-right pr-3">W-L-P</span>
        <span className="w-14 text-right">pts</span>
      </div>
      {ranked.map((r) => (
        <div
          key={r.userId}
          className={`flex items-center px-4 py-2 row-line last:border-b-0 text-sm ${
            r.userId === meId ? "bg-turf/5" : ""
          }`}
        >
          <span className="w-8 font-mono text-black/40">{r.rank}</span>
          <span className="flex-1 truncate">{r.name}</span>
          {extraLabel && <span className="w-24 text-right pr-3 font-mono text-xs text-black/50 truncate">{r.extra || "—"}</span>}
          <span className="w-20 text-right pr-3 font-mono text-xs text-black/50">
            {r.wins}-{r.losses}-{r.pushes}
          </span>
          <span className="w-14 text-right font-mono font-semibold">{r.points}</span>
        </div>
      ))}
    </div>
  );
}
