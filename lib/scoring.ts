// Scoring engine for the Survivor draft pool.
// Kicker formula is taken directly from the league rules:
//   1–49 yd made FG:  1 + 0.07 * yards
//   50+ yd made FG:   0.11 * yards
//   missed FG:        (100 - yards) * -0.025
//   made PAT:         +1
//   failed PAT:       -2
//   longest FG of the round: +3
//   game-winning FG:  +2

export interface KickerStatInput {
  fgMade: number[]; // yardages of made field goals
  fgMissed: number[]; // yardages of missed field goals
  patMade: number;
  patFailed: number;
  longest: boolean;
  gameWinner: boolean;
}

export function kickerPoints(stat: KickerStatInput | null | undefined): number {
  if (!stat) return 0;
  let pts = 0;

  for (const yards of stat.fgMade) {
    pts += yards <= 49 ? 1 + 0.07 * yards : 0.11 * yards;
  }
  for (const yards of stat.fgMissed) {
    pts += (100 - yards) * -0.025;
  }
  pts += stat.patMade * 1;
  pts += stat.patFailed * -2;
  if (stat.longest) pts += 3;
  if (stat.gameWinner) pts += 2;

  return round2(pts);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Derives slot counts for a round from how many teams are playing that round's
// games. Falls back to an even skill-position split if no explicit mix is given —
// but in practice the admin sets positionMix per round (see prisma/seed.ts) so this
// is mainly a safety net.
export function defaultPositionMix(teamCount: number) {
  if (teamCount <= 2) {
    return Array.from({ length: teamCount }, () => ({ pos: "SUPER FLEX", count: 1 }));
  }
  // Rough DK-style skill ratio, scaled to the team count.
  const qb = Math.max(1, Math.round(teamCount * 0.17));
  const rb = Math.max(1, Math.round(teamCount * 0.25));
  const wr = Math.max(1, Math.round(teamCount * 0.33));
  const te = Math.max(1, Math.round(teamCount * 0.08));
  const used = qb + rb + wr + te;
  const flex = Math.max(0, teamCount - used);
  return [
    { pos: "QB", count: qb },
    { pos: "RB", count: rb },
    { pos: "WR", count: wr },
    { pos: "TE", count: te },
    ...(flex > 0 ? [{ pos: "FLEX", count: flex }] : []),
  ];
}
