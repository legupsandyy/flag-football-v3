import { prisma } from "./db";
import { kickerPoints, round2 } from "./scoring";

// Each user's Survivor total and best single-round score (used for tiebreaks).
export async function loadSurvivorScores() {
  const [users, rounds, picks, kickerStats] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.round.findMany({ orderBy: { order: "asc" } }),
    prisma.survivorPick.findMany({ include: { player: true, slot: true } }),
    prisma.kickerStat.findMany(),
  ]);

  const kicker = new Map<string, number>();
  for (const s of kickerStats) {
    kicker.set(
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
      let raw = 0;
      for (const p of picks) {
        if (p.userId !== u.id || p.slot.roundId !== r.id) continue;
        if (p.kickTeamId) raw += kicker.get(`${p.kickTeamId}:${r.id}`) ?? 0;
        else if (p.player) raw += p.player.dkPoints;
      }
      perRound[r.id] = round2(raw * r.multiplier);
    }
    const vals = Object.values(perRound);
    const total = round2(vals.reduce((a, b) => a + b, 0));
    const best = vals.length ? Math.max(...vals) : 0;
    return { userId: u.id, name: u.name, perRound, total, best };
  });

  return { rounds, table };
}
