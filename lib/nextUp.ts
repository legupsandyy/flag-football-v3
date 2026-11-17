import { prisma } from "./db";

// The soonest thing that is about to lock: a game kickoff or a Survivor round.
export async function getNextUp(): Promise<{ label: string; iso: string } | null> {
  try {
    const now = new Date();
    const game = await prisma.game.findFirst({
      where: { kickoff: { gt: now } },
      orderBy: { kickoff: "asc" },
      include: { slate: true },
    });
    const rounds = await prisma.round.findMany({ orderBy: { order: "asc" } });

    const options: { label: string; at: Date }[] = [];
    if (game) options.push({ label: `${game.awayTeam} at ${game.homeTeam}`, at: game.kickoff });
    for (const r of rounds) {
      // A round only counts once teams have been set up for it.
      if (r.lockTime > now && (JSON.parse(r.teamIds) as string[]).length > 0) {
        options.push({ label: `Survivor roster · ${r.label}`, at: r.lockTime });
      }
    }
    if (options.length === 0) return null;
    options.sort((a, b) => a.at.getTime() - b.at.getTime());
    return { label: options[0].label, iso: options[0].at.toISOString() };
  } catch {
    return null;
  }
}
