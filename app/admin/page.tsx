import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { getSetting } from "@/lib/settings";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

async function load() {
  // One after another (not all at once) so the database only ever sees one request at a time.
  const slates = await prisma.slate.findMany({
    orderBy: { order: "asc" },
    include: { games: { orderBy: { kickoff: "asc" } } },
  });
  const users = await prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const playoffTeams = await getSetting("playoffTeams");
  const superBowlWinner = await getSetting("superBowlWinner");
  const dkSlates = await prisma.dkSlate.findMany({ orderBy: { createdAt: "asc" }, include: { scores: true } });
  const teams = await prisma.team.findMany({ select: { id: true } });
  const rounds = await prisma.round.findMany({ orderBy: { order: "asc" } });
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const kickers = await prisma.kickerStat.findMany();
  return { slates, users, playoffTeams, superBowlWinner, dkSlates, teams, rounds, players, kickers };
}

export default async function AdminPage() {
  const header = (
    <>
      <div className="font-mono text-xs text-black/40 mb-1">postseason / admin</div>
      <h1 className="font-display text-2xl mb-4">Admin</h1>
    </>
  );

  if (!isAdmin()) {
    return (
      <div className="px-5 py-8 max-w-2xl mx-auto">
        {header}
        <p className="text-black/50 text-sm mb-6">Commissioner only. Enter the admin password.</p>
        <AdminLogin />
      </div>
    );
  }

  let loaded;
  try {
    loaded = await load();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="px-5 py-8 max-w-2xl mx-auto">
        {header}
        <div className="border border-amber/50 bg-amber/5 px-3 py-3 text-sm font-mono text-amber whitespace-pre-wrap break-words">
          Couldn&apos;t load the admin data. Refresh the page. If it keeps happening, send this message to Claude:
          {"\n\n"}
          {msg.split("\n").filter(Boolean).slice(-4).join("\n").slice(0, 600)}
        </div>
      </div>
    );
  }
  const { slates, users, playoffTeams, superBowlWinner, dkSlates, teams, rounds, players, kickers } = loaded;

  return (
    <div className="px-5 py-8 max-w-2xl mx-auto">
      {header}
      <p className="text-black/50 text-sm mb-8">
        Add each game with its spread and total. After a game ends, open it, type the final score, tick &ldquo;final&rdquo;
        and save — grading happens automatically.
      </p>
      <AdminPanel
        slates={slates.map((s) => ({
          id: s.id,
          label: s.label,
          salamiLine: s.salamiLine,
          games: s.games.map((g) => ({
            id: g.id,
            awayTeam: g.awayTeam,
            homeTeam: g.homeTeam,
            kickoff: g.kickoff.toISOString(),
            homeSpread: g.homeSpread,
            total: g.total,
            awayScore: g.awayScore,
            homeScore: g.homeScore,
            isFinal: g.isFinal,
          })),
        }))}
        members={users}
        dkSlates={dkSlates.map((d) => ({
          id: d.id,
          label: d.label,
          scores: Object.fromEntries(d.scores.map((x) => [x.userId, x.points])),
        }))}
        playoffTeams={playoffTeams}
        superBowlWinner={superBowlWinner}
        survivor={{
          teamIds: teams.map((t) => t.id),
          rounds: rounds.map((r) => ({
            id: r.id,
            label: r.label,
            lockTime: r.lockTime.toISOString(),
            multiplier: r.multiplier,
            teamIds: JSON.parse(r.teamIds) as string[],
          })),
          players: players.map((p) => ({ id: p.id, name: p.name, pos: p.pos, teamId: p.teamId, dkPoints: p.dkPoints })),
          kickers: kickers.map((k) => ({
            teamId: k.teamId,
            roundId: k.roundId,
            fgMade: (JSON.parse(k.fgMade) as number[]).join(", "),
            fgMissed: (JSON.parse(k.fgMissed) as number[]).join(", "),
            patMade: k.patMade,
            patFailed: k.patFailed,
            longest: k.longest,
            gameWinner: k.gameWinner,
          })),
        }}
      />
    </div>
  );
}
