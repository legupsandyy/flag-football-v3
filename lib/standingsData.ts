import { prisma } from "./db";
import { loadPickemCombined } from "./pickemCombined";
import { loadSurvivorScores } from "./survivorScores";

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

// Everyone's rank and score in each contest: order is Survivor, Pick'em, DK.
export async function loadStandings(meId: string) {
  const pickem = await loadPickemCombined(meId);
  const survivor = await loadSurvivorScores();
  const dkScores = await prisma.dkScore.findMany();
  const users = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const svTotal = new Map<string, number>(survivor.table.map((r) => [r.userId, r.total] as [string, number]));
  const dkTotal = new Map<string, number>();
  for (const d of dkScores) dkTotal.set(d.userId, (dkTotal.get(d.userId) ?? 0) + d.points);

  const pickemRank = rankMap(pickem.rows.map((r) => ({ userId: r.userId, score: r.points, tb: r.tb })));
  const svRank = rankMap(survivor.table.map((r) => ({ userId: r.userId, score: r.total, tb: 0 })));
  const dkRank = rankMap(users.map((u) => ({ userId: u.id, score: dkTotal.get(u.id) ?? 0, tb: svTotal.get(u.id) ?? 0 })));

  const pickemPts = new Map(pickem.rows.map((r) => [r.userId, r.points] as [string, number]));

  const rows = users
    .map((u) => {
      const ranks = [svRank.get(u.id) ?? 0, pickemRank.get(u.id) ?? 0, dkRank.get(u.id) ?? 0];
      return {
        id: u.id,
        name: u.name,
        ranks,
        scores: [svTotal.get(u.id) ?? 0, pickemPts.get(u.id) ?? 0, dkTotal.get(u.id) ?? 0],
        avg: ranks.reduce((a, b) => a + b, 0) / ranks.length,
      };
    })
    .sort((a, b) => a.avg - b.avg || a.name.localeCompare(b.name));

  // A contest has "started" once anyone has a non-zero score.
  const started = [0, 1, 2].map((i) => rows.some((r) => r.scores[i] !== 0));
  return { rows, started, count: users.length };
}
