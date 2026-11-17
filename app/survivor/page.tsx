import Link from "next/link";
import { Lock, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import Leaderboard from "@/components/Leaderboard";
import LocalTime from "@/components/LocalTime";
import RulesBox from "@/components/RulesBox";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SurvivorHub() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const rounds = await prisma.round.findMany({ orderBy: { order: "asc" } });
  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-1 font-mono text-xs text-black/40">survivor</div>
      <h1 className="font-display text-3xl">Survivor</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        One roster per round, one player from each team still playing. A player can only be used once, and points grow each round.
      </p>

      <RulesBox defaultOpen={false}>
        <ul>
          <li>
            Fill each lineup with <strong>one player from each team</strong> in the playoff player pool. Roster size depends on how many teams are playing
            (8 teams = 8 players, 1 from each team). There are <strong>no salaries or price limits</strong>.
          </li>
          <li>
            Seats: Wild Card (12 teams) 2 QB, 3 RB, 4 WR, 1 TE, 2 FLEX. Divisional (8 teams) 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX. Conference (4 teams) 1 QB, 1 RB, 1
            WR, 1 TE. Super Bowl (2 teams) 2 SUPER FLEX. Every round also has 1 kicker seat.
          </li>
          <li>
            <strong>Use each player once.</strong> Once you use a player in a lineup, you can&apos;t use that player again for the rest of the playoffs.
          </li>
          <li>Submit your entire lineup <strong>before the start of the first game each weekend</strong>. Scores are updated by the commissioner.</li>
          <li>
            Each round is <strong>weighted</strong>: Wild Card ×1.00, Divisional ×1.33, Conference ×2.33, Super Bowl ×3.33. The person with the most points at
            the end wins.
          </li>
          <li>
            <strong>Position players</strong> (QB, RB, WR, TE) use DraftKings DFS scoring.
          </li>
          <li>
            <strong>Kicker:</strong> each round, pick one team you think will have the best kicking performance (field goals and PATs). There is no limit to
            how many times you can use a team.
          </li>
          <li>
            Kicker scoring: made FG 1-49 yards = 0.07 per yard + 1. Made FG 50+ yards = 0.11 per yard. Missed FG = (100 − yards) × −0.025. Made PAT +1. Failed
            PAT −2. Longest FG +3. Game-winning FG +2.
          </li>
        </ul>
      </RulesBox>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rounds.map((r) => {
          const ready = (JSON.parse(r.teamIds) as string[]).length > 0;
          const locked = ready && now >= r.lockTime;
          return (
            <Link
              key={r.id}
              href={`/survivor/${r.id}`}
              className="group flex flex-col justify-between border border-grid bg-panel p-3 transition-colors hover:border-turf/50"
            >
              <div className="flex items-start justify-between">
                <div className="font-display text-base">{r.label}</div>
                <span className="font-mono text-sm font-semibold text-amber">×{r.multiplier.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-black/50">
                {!ready ? (
                  <span>not set up yet</span>
                ) : locked ? (
                  <span className="flex items-center gap-1">
                    <Lock size={11} /> locked
                  </span>
                ) : (
                  <span className="text-turf">
                    open · <LocalTime iso={r.lockTime.toISOString()} />
                  </span>
                )}
                <ChevronRight size={14} className="shrink-0 text-black/20 group-hover:text-turf" />
              </div>
            </Link>
          );
        })}
      </div>

      <Leaderboard />
    </div>
  );
}
