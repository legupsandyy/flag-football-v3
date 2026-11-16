import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { getSetting } from "@/lib/settings";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

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

  const [slates, users, playoffTeams, superBowlWinner] = await Promise.all([
    prisma.slate.findMany({ orderBy: { order: "asc" }, include: { games: { orderBy: { kickoff: "asc" } } } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getSetting("playoffTeams"),
    getSetting("superBowlWinner"),
  ]);

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
        playoffTeams={playoffTeams}
        superBowlWinner={superBowlWinner}
      />
    </div>
  );
}
