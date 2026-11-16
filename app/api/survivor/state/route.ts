import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { kickerPoints } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const roundId = req.nextUrl.searchParams.get("roundId");
  if (!roundId) return NextResponse.json({ error: "roundId required" }, { status: 400 });

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { slots: { include: { picks: { where: { userId: user.id }, include: { player: true } } } } },
  });
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  const teamIds: string[] = JSON.parse(round.teamIds);
  const players = await prisma.player.findMany({ where: { teamId: { in: teamIds } }, include: { team: true } });

  // Players this user already used in OTHER rounds are off-limits (no reuse rule).
  const usedElsewhere = await prisma.survivorPick.findMany({
    where: { userId: user.id, playerId: { not: null }, slot: { roundId: { not: roundId } } },
    select: { playerId: true },
  });
  const usedPlayerIds = new Set(usedElsewhere.map((p) => p.playerId));

  const kickerStats = await prisma.kickerStat.findMany({ where: { roundId } });
  const kickerScores = Object.fromEntries(
    teamIds.map((tid) => {
      const s = kickerStats.find((k) => k.teamId === tid);
      const points = s
        ? kickerPoints({
            fgMade: JSON.parse(s.fgMade),
            fgMissed: JSON.parse(s.fgMissed),
            patMade: s.patMade,
            patFailed: s.patFailed,
            longest: s.longest,
            gameWinner: s.gameWinner,
          })
        : 0;
      return [tid, points];
    })
  );

  const locked = new Date() >= round.lockTime;

  return NextResponse.json({
    round: {
      id: round.id,
      label: round.label,
      multiplier: round.multiplier,
      lockTime: round.lockTime,
      locked,
      teamIds,
    },
    slots: round.slots.map((s) => ({
      id: s.id,
      position: s.position,
      index: s.index,
      pick: s.picks[0]
        ? { player: s.picks[0].player, kickTeamId: s.picks[0].kickTeamId }
        : null,
    })),
    players: players
      .filter((p) => !usedPlayerIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, pos: p.pos, teamId: p.teamId, teamName: p.team.name, dkPoints: p.dkPoints })),
    kickerScores,
  });
}
