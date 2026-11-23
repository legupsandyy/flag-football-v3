import { loadPickem, BoardRow } from "./pickemData";
import type { Result } from "./pickem";

type Others = { label: string; names: string[] }[];

export type CombinedGame = {
  id: string;
  away: string;
  home: string;
  kickoff: string;
  homeSpread: number;
  total: number;
  isFinal: boolean;
  awayScore: number | null;
  homeScore: number | null;
  locked: boolean;
  ats: { myPick: string | null; result: Result | null; others: Others };
  ou: { myPick: string | null; result: Result | null; others: Others };
};

export type CombinedSlate = {
  id: string;
  label: string;
  games: CombinedGame[];
  salamiLine: number | null;
  salamiLocked: boolean;
  salamiPick: string | null;
  salamiResult: Result | null;
  salamiOthers: Others;
};

// One Pick'em: ATS + O/U + Grand Salami + Super Bowl pick, all in a single list.
export async function loadPickemCombined(meId: string) {
  const ats = await loadPickem("ats", meId);
  const ou = await loadPickem("ou", meId);

  const slates: CombinedSlate[] = ats.slates.map((s) => {
    const ouSlate = ou.slates.find((x) => x.id === s.id);
    return {
      id: s.id,
      label: s.label,
      salamiLine: ouSlate?.salamiLine ?? s.salamiLine,
      salamiLocked: ouSlate?.salamiLocked ?? s.salamiLocked,
      salamiPick: ouSlate?.salamiPick ?? null,
      salamiResult: ouSlate?.salamiResult ?? null,
      salamiOthers: ouSlate?.salamiOthers ?? [],
      games: s.games.map((g) => {
        const o = ouSlate?.games.find((x) => x.id === g.id);
        return {
          id: g.id,
          away: g.away,
          home: g.home,
          kickoff: g.kickoff,
          homeSpread: g.homeSpread,
          total: g.total,
          isFinal: g.isFinal,
          awayScore: g.awayScore,
          homeScore: g.homeScore,
          locked: g.locked,
          ats: { myPick: g.myPick, result: g.result, others: g.others },
          ou: { myPick: o?.myPick ?? null, result: o?.result ?? null, others: o?.others ?? [] },
        };
      }),
    };
  });

  // Add each person's ATS-side and O/U-side results together.
  const ouRows = new Map(ou.rows.map((r) => [r.userId, r] as [string, BoardRow]));
  const rows: BoardRow[] = ats.rows
    .map((a) => {
      const o = ouRows.get(a.userId);
      return {
        userId: a.userId,
        name: a.name,
        points: a.points + (o?.points ?? 0),
        wins: a.wins + (o?.wins ?? 0),
        losses: a.losses + (o?.losses ?? 0),
        pushes: a.pushes + (o?.pushes ?? 0),
        tb: a.tb, // highest single DK slate score
        extra: a.extra, // Super Bowl pick once it's visible
      };
    })
    .sort((x, y) => y.points - x.points || y.tb - x.tb || x.name.localeCompare(y.name));

  return {
    slates,
    rows,
    sbLocked: ats.sbLocked,
    playoffTeams: ats.playoffTeams,
    sbWinner: ats.sbWinner,
    mySbPick: ats.mySbPick,
  };
}
