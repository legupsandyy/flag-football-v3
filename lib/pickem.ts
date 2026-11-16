// Scoring + lock rules for the pick'em contests. Everything here is plain
// math with no database calls, so it is easy to test.

export const POINTS = {
  ats: { win: 1, push: 0 },
  ou: { win: 1, push: 0.5 },
  salami: { win: 3, push: 1.5 },
  superBowl: 4,
};

export type Result = "win" | "loss" | "push";

type GameLike = {
  homeSpread: number;
  total: number;
  awayScore: number | null;
  homeScore: number | null;
  isFinal: boolean;
};

function hasScore(g: GameLike) {
  return g.isFinal && g.awayScore !== null && g.homeScore !== null;
}

// Home spread is negative when the home team is favored (e.g. -3.5).
// Home covers when (home score + spread) beats the away score.
export function gradeAts(g: GameLike, side: string): Result | null {
  if (!hasScore(g)) return null;
  const margin = g.homeScore! + g.homeSpread - g.awayScore!;
  if (margin === 0) return "push";
  const homeCovered = margin > 0;
  return (side === "home") === homeCovered ? "win" : "loss";
}

export function gradeOu(g: GameLike, side: string): Result | null {
  if (!hasScore(g)) return null;
  const total = g.homeScore! + g.awayScore!;
  if (total === g.total) return "push";
  const wentOver = total > g.total;
  return (side === "over") === wentOver ? "win" : "loss";
}

// Grand Salami: the combined score of EVERY game in the slate vs. the line.
// Only gradeable once every game in the slate is final.
export function gradeSalami(line: number | null, games: GameLike[], side: string): Result | null {
  if (line === null || games.length === 0) return null;
  if (!games.every(hasScore)) return null;
  const total = games.reduce((sum, g) => sum + g.homeScore! + g.awayScore!, 0);
  if (total === line) return "push";
  const wentOver = total > line;
  return (side === "over") === wentOver ? "win" : "loss";
}

export function pointsFor(kind: "ats" | "ou" | "salami", result: Result | null): number {
  if (result === null || result === "loss") return 0;
  return result === "win" ? POINTS[kind].win : POINTS[kind].push;
}

// "BUF -3.5" style label for a team's side of the spread.
export function spreadLabel(homeSpread: number, forSide: "away" | "home"): string {
  const v = forSide === "home" ? homeSpread : -homeSpread;
  if (v === 0) return "PK";
  return v > 0 ? `+${v}` : `${v}`;
}
