import Link from "next/link";
import { prisma } from "@/lib/db";
import Leaderboard from "@/components/Leaderboard";

export const dynamic = "force-dynamic";

export default async function SurvivorHub() {
  const rounds = await prisma.round.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="px-5 py-8 max-w-2xl mx-auto">
      <div className="font-mono text-xs text-black/40 mb-1">postseason / survivor</div>
      <h1 className="font-display text-2xl mb-1">Survivor</h1>
      <p className="text-black/50 text-sm mb-6">
        One roster per round, drawn from the teams still playing. Points scale up each round.
      </p>

      <div className="flex mb-8 overflow-x-auto border border-grid">
        {rounds.map((r) => (
          <Link
            key={r.id}
            href={`/survivor/${r.id}`}
            className="flex-1 min-w-[100px] px-3 py-2.5 text-center hover:bg-black/[0.03] transition-colors font-mono border-r border-grid last:border-r-0"
          >
            <div className="text-[11px] uppercase tracking-wide text-black/60">{r.label}</div>
            <div className="text-xs text-amber mt-0.5">×{r.multiplier.toFixed(2)}</div>
          </Link>
        ))}
      </div>

      <Leaderboard />
    </div>
  );
}
