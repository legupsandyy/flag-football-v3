import { prisma } from "./db";
import { getPlayoffTeams, getSetting } from "./settings";
import { gradeAts, gradeOu, gradeSalami, pointsFor, POINTS, Result } from "./pickem";

// Shapes handed to the pages (kept plain/serializable so they can go to client components).
export type GameView = {
  id: string;
  away: string;
  home: string;
  kickoff: string; // ISO
  homeSpread: number;
  total: number;
  isFinal: boolean;
  awayScore: number | null;
  homeScore: number | null;
  myPick: string | null;
  locked: boolean;
  result: Result | null;
  others: { label: string; names: string[] }[]; // only filled once the game is locked
};

export type SlateView = {
  id: string;
  label: string;
  games: GameView[];
  salamiLine: number | null;
  salamiLocked: boolean;
  salamiPick: string | null;
  salamiResult: Result | null;
  salamiOthers: { label: string; names: string[] }[];
};

export type BoardRow = {
  userId: string;
  name: string;
  points: number;
  wins: number;
  losses: number;
  pushes: number;
  extra: string; // e.g. Super Bowl pick (once visible)
};

export async function loadPickem(kind: "ats" | "ou", meId: string) {
  const now = new Date();
  const [slates, users, sbPicks, playoffTeams, sbWinner] = await Promise.all([
    prisma.slate.findMany({
      orderBy: { order: "asc" },
      include: {
        games: {
          orderBy: { kickoff: "asc" },
          include: { atsPicks: true, ouPicks: true },
        },
        salamiPicks: true,
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.superBowlPick.findMany(),
    getPlayoffTeams(),
    getSetting("superBowlWinner"),
  ]);

  const nameOf = new Map<string, string>(users.map((u: { id: string; name: string }) => [u.id, u.name] as [string, string]));
  const names = (ids: string[]) => ids.map((id) => nameOf.get(id) ?? "?").sort((a, b) => a.localeCompare(b));

  // Earliest Wild Card kickoff = when the Super Bowl pick locks.
  const wc = slates.find((s) => s.id === "wc");
  const firstWc = wc?.games[0]?.kickoff ?? null;
  const sbLocked = firstWc ? now >= firstWc : false;

  const board = new Map<string, BoardRow>(
    users.map((u) => [u.id, { userId: u.id, name: u.name, points: 0, wins: 0, losses: 0, pushes: 0, extra: "" }])
  );
  const bump = (userId: string, r: Result | null, k: "ats" | "ou" | "salami") => {
    const row = board.get(userId);
    if (!row || r === null) return;
    row.points += pointsFor(k, r);
    if (r === "win") row.wins++;
    else if (r === "loss") row.losses++;
    else row.pushes++;
  };

  const slateViews: SlateView[] = slates.map((s) => {
    const firstKick = s.games[0]?.kickoff ?? null;
    const salamiLocked = firstKick ? now >= firstKick : false;

    const gameViews: GameView[] = s.games.map((g) => {
      const picks = kind === "ats" ? g.atsPicks : g.ouPicks;
      const mine = picks.find((p) => p.userId === meId)?.side ?? null;
      const locked = now >= g.kickoff;

      for (const p of picks) {
        bump(p.userId, kind === "ats" ? gradeAts(g, p.side) : gradeOu(g, p.side), kind);
      }

      const sides = kind === "ats" ? ["away", "home"] : ["over", "under"];
      const labelFor = (side: string) =>
        kind === "ats" ? (side === "away" ? g.awayTeam : g.homeTeam) : side === "over" ? "Over" : "Under";
      const others = locked
        ? sides.map((side) => ({
            label: labelFor(side),
            names: names(picks.filter((p) => p.side === side).map((p) => p.userId)),
          }))
        : [];

      return {
        id: g.id,
        away: g.awayTeam,
        home: g.homeTeam,
        kickoff: g.kickoff.toISOString(),
        homeSpread: g.homeSpread,
        total: g.total,
        isFinal: g.isFinal,
        awayScore: g.awayScore,
        homeScore: g.homeScore,
        myPick: mine,
        locked,
        result: mine ? (kind === "ats" ? gradeAts(g, mine) : gradeOu(g, mine)) : null,
        others,
      };
    });

    let salamiPick: string | null = null;
    let salamiResult: Result | null = null;
    let salamiOthers: { label: string; names: string[] }[] = [];
    if (kind === "ou") {
      for (const p of s.salamiPicks) {
        bump(p.userId, gradeSalami(s.salamiLine, s.games, p.side), "salami");
      }
      salamiPick = s.salamiPicks.find((p) => p.userId === meId)?.side ?? null;
      salamiResult = salamiPick ? gradeSalami(s.salamiLine, s.games, salamiPick) : null;
      if (salamiLocked) {
        salamiOthers = ["over", "under"].map((side) => ({
          label: side === "over" ? "Over" : "Under",
          names: names(s.salamiPicks.filter((p) => p.side === side).map((p) => p.userId)),
        }));
      }
    }

    return {
      id: s.id,
      label: s.label,
      games: gameViews,
      salamiLine: s.salamiLine,
      salamiLocked,
      salamiPick,
      salamiResult,
      salamiOthers,
    };
  });

  // Super Bowl winner pick lives with the ATS contest.
  let mySbPick: string | null = null;
  if (kind === "ats") {
    mySbPick = sbPicks.find((p) => p.userId === meId)?.team ?? null;
    for (const p of sbPicks) {
      const row = board.get(p.userId);
      if (!row) continue;
      if (sbWinner && p.team === sbWinner) row.points += POINTS.superBowl;
      if (sbLocked) row.extra = p.team;
    }
  }

  const rows = Array.from(board.values()).sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name)
  );

  return { slates: slateViews, rows, sbLocked, playoffTeams, sbWinner, mySbPick };
}
