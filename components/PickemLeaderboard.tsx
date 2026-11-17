import type { BoardRow } from "@/lib/pickemData";
import RankBadge from "./RankBadge";

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
      <div className="row-line flex items-center gap-3 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-black/40">
        <span className="w-6">#</span>
        <span className="min-w-0 flex-1">name</span>
        {extraLabel && <span className="w-16 text-right">{extraLabel}</span>}
        <span className="w-14 text-right">W-L-P</span>
        <span className="w-10 text-right">pts</span>
      </div>
      {ranked.map((r) => {
        const me = r.userId === meId;
        return (
          <div
            key={r.userId}
            className={`row-line flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm last:border-b-0 ${
              me ? "border-l-turf bg-turf/5" : "border-l-transparent"
            }`}
          >
            <RankBadge rank={r.rank} />
            <span className={`min-w-0 flex-1 truncate ${me ? "font-semibold" : ""}`}>{r.name}</span>
            {extraLabel && (
              <span className="w-16 truncate text-right font-mono text-xs text-black/50">{r.extra || "—"}</span>
            )}
            <span className="w-14 text-right font-mono text-xs text-black/50">
              {r.wins}-{r.losses}-{r.pushes}
            </span>
            <span className="w-10 text-right font-mono font-semibold">{r.points}</span>
          </div>
        );
      })}
    </div>
  );
}
