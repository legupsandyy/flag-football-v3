import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadPickem } from "@/lib/pickemData";
import { loadSurvivorScores } from "@/lib/survivorScores";
import RankBadge from "@/components/RankBadge";

export const dynamic = "force-dynamic";

type Entry = { userId: string; score: number; tb: number };

// Ties (same score and same tiebreak) share a rank.
function rankMap(entries: Entry[]) {
  const sorted = [...entries].sort((a, b) => b.score - a.score || b.tb - a.tb);
  const out = new Map<string, number>();
  let lastKey = "";
  let lastRank = 0;
  sorted.forEach((e, i) => {
    const key = `${e.score}|${e.tb}`;
    if (key !== lastKey) {
      lastRank = i + 1;
      lastKey = key;
    }
    out.set(e.userId, lastRank);
  });
  return out;
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

export default async function StandingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const ats = await loadPickem("ats", me.id);
  const ou = await loadPickem("ou", me.id);
  const survivor = await loadSurvivorScores();
  const dkScores = await prisma.dkScore.findMany();
  const users = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const svTotal = new Map<string, number>(survivor.table.map((r) => [r.userId, r.total] as [string, number]));
  const dkTotal = new Map<string, number>();
  for (const d of dkScores) dkTotal.set(d.userId, (dkTotal.get(d.userId) ?? 0) + d.points);

  const atsRank = rankMap(ats.rows.map((r) => ({ userId: r.userId, score: r.points, tb: r.tb })));
  const ouRank = rankMap(ou.rows.map((r) => ({ userId: r.userId, score: r.points, tb: r.tb })));
  const svRank = rankMap(survivor.table.map((r) => ({ userId: r.userId, score: r.total, tb: 0 })));
  const dkRank = rankMap(users.map((u) => ({ userId: u.id, score: dkTotal.get(u.id) ?? 0, tb: svTotal.get(u.id) ?? 0 })));

  const atsPts = new Map(ats.rows.map((r) => [r.userId, r.points] as [string, number]));
  const ouPts = new Map(ou.rows.map((r) => [r.userId, r.points] as [string, number]));

  const rows = users
    .map((u) => {
      const ranks = [svRank.get(u.id) ?? 0, atsRank.get(u.id) ?? 0, ouRank.get(u.id) ?? 0, dkRank.get(u.id) ?? 0];
      return {
        id: u.id,
        name: u.name,
        ranks,
        scores: [svTotal.get(u.id) ?? 0, atsPts.get(u.id) ?? 0, ouPts.get(u.id) ?? 0, dkTotal.get(u.id) ?? 0],
        avg: ranks.reduce((a, b) => a + b, 0) / ranks.length,
      };
    })
    .sort((a, b) => a.avg - b.avg || a.name.localeCompare(b.name));

  const heads = ["Survivor", "ATS", "O/U", "DK"];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-1 font-mono text-xs text-black/40">postseason / standings</div>
      <h1 className="font-display text-3xl">Standings</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        Where everyone ranks in each contest. Each contest keeps its own winner. Tied people share a rank. The list is ordered by average rank.
      </p>

      {rows.length === 0 ? (
        <div className="border border-grid bg-panel px-4 py-8 text-center text-sm text-black/50">No one has joined yet.</div>
      ) : (
        <div className="overflow-x-auto border border-grid bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="row-line font-mono text-[10px] uppercase tracking-wide text-black/40">
                <th className="px-4 py-2 text-left font-normal">name</th>
                {heads.map((h) => (
                  <th key={h} className="px-3 py-2 text-center font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mine = r.id === me.id;
                return (
                  <tr key={r.id} className={`row-line border-l-2 ${mine ? "border-l-turf bg-turf/5" : "border-l-transparent"}`}>
                    <td className={`px-4 py-2.5 ${mine ? "font-semibold" : ""}`}>{r.name}</td>
                    {r.ranks.map((rk, i) => (
                      <td key={i} className="px-3 py-2">
                        <div className="flex flex-col items-center gap-0.5">
                          <RankBadge rank={rk} />
                          <span className="font-mono text-[10px] text-black/40">{fmt(r.scores[i])}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
