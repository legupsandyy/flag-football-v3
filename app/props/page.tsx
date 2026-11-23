import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadProps } from "@/lib/propsData";
import PropsBoard from "@/components/PropsBoard";
import RulesBlock from "@/components/RulesBlock";
import RankBadge from "@/components/RankBadge";
import LocalTime from "@/components/LocalTime";

export const dynamic = "force-dynamic";

export default async function PropsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const data = await loadProps(me.id);

  // Tied people (same score and same tiebreaker distance) share a rank.
  let lastKey = "";
  let lastRank = 0;
  const ranked = data.rows.map((r, i) => {
    const key = `${r.correct}|${r.diff}`;
    if (key !== lastKey) {
      lastRank = i + 1;
      lastKey = key;
    }
    return { ...r, rank: lastRank };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-1 font-mono text-xs text-black/40">postseason / super bowl props</div>
      <h1 className="font-display text-3xl">Super Bowl Props</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        Ten questions about the big game, plus a tiebreaker.
        {data.kickoff && (
          <>
            {" "}
            {data.locked ? "Locked at kickoff." : "Locks at kickoff: "}
            {!data.locked && <LocalTime iso={data.kickoff} />}
          </>
        )}
      </p>

      <RulesBlock kind="props" />

      {!data.hasGame ? (
        <div className="border border-grid bg-panel px-4 py-8 text-center text-sm text-black/50">
          Props open once the Super Bowl matchup is set.
        </div>
      ) : (
        <>
          {data.graded > 0 && (
            <>
              <h2 className="mb-2 font-display text-lg">Standings</h2>
              <div className="mb-10 border border-grid bg-panel">
                {ranked.map((r) => (
                  <div
                    key={r.userId}
                    className={`row-line flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm last:border-b-0 ${
                      r.userId === me.id ? "border-l-turf bg-turf/5" : "border-l-transparent"
                    }`}
                  >
                    <RankBadge rank={r.rank} />
                    <span className={`min-w-0 flex-1 truncate ${r.userId === me.id ? "font-semibold" : ""}`}>{r.name}</span>
                    {data.finalTotal !== null && r.guess !== null && (
                      <span className="font-mono text-xs text-black/40">guess {r.guess}</span>
                    )}
                    <span className="w-16 text-right font-mono font-semibold">
                      {r.correct}/{data.graded}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <PropsBoard data={data} />
        </>
      )}
    </div>
  );
}
