import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { kickerPoints, round2 } from "@/lib/scoring";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [users, rounds, picks, kickerStats] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.round.findMany({ orderBy: { order: "asc" } }),
    prisma.survivorPick.findMany({ include: { player: true, slot: true } }),
    prisma.kickerStat.findMany(),
  ]);

  const kickerScoreByTeamRound = new Map<string, number>();
  for (const s of kickerStats) {
    kickerScoreByTeamRound.set(
      `${s.teamId}:${s.roundId}`,
      kickerPoints({
        fgMade: JSON.parse(s.fgMade),
        fgMissed: JSON.parse(s.fgMissed),
        patMade: s.patMade,
        patFailed: s.patFailed,
        longest: s.longest,
        gameWinner: s.gameWinner,
      })
    );
  }

  const table = users.map((u) => {
    const perRound: Record<string, number> = {};
    for (const r of rounds) {
      const userPicksThisRound = picks.filter((p) => p.userId === u.id && p.slot.roundId === r.id);
      const raw = userPicksThisRound.reduce((sum, p) => {
        if (p.kickTeamId) return sum + (kickerScoreByTeamRound.get(`${p.kickTeamId}:${r.id}`) ?? 0);
        if (p.player) return sum + p.player.dkPoints;
        return sum;
      }, 0);
      perRound[r.id] = round2(raw * r.multiplier);
    }
    const total = round2(Object.values(perRound).reduce((a, b) => a + b, 0));
    return { userId: u.id, name: u.name, perRound, total };
  });

  table.sort((a, b) => b.total - a.total);

  return NextResponse.json({ rounds: rounds.map((r) => ({ id: r.id, label: r.label })), table, meId: me.id });
}
