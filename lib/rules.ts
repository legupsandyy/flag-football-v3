import { getSetting } from "./settings";

export type RuleKind = "pickem" | "survivor" | "dk" | "props";

export const RULE_LABELS: Record<RuleKind, string> = {
  pickem: "Pick'em (ATS + O/U)",
  props: "Super Bowl props",
  survivor: "Survivor",
  dk: "DK Slates",
};

// One line = one bullet. Put **double stars** around words to make them bold.
export const DEFAULT_RULES: Record<RuleKind, string> = {
  pickem: [
    "**Two picks on every game.** Pick who you think will **cover the spread** (ATS), and pick **Over or Under** on the listed total. You must submit your picks **before the start of each game**.",
    "ATS: a correct pick is **1 point**. If your pick pushes, it counts as **0 points**.",
    "Over/Under: a correct pick is **1 point**. If your pick pushes, it counts as **0.5 points**.",
    "**Grand Salami:** the posted total of the combined scores of every team in every game that round. Pick Over or Under on it. A correct pick earns **3 points**. It is not played for the Super Bowl, since that is a stand-alone game.",
    "**Super Bowl pick:** before Wild Card weekend begins, choose who you think wins the Super Bowl. If your team wins, it adds **4 points** to your running total.",
    "**Tiebreaker:** ties go to the person with the highest individual DK slate score.",
  ].join("\n"),
  props: [
    "Answer **10 questions** about the Super Bowl. Each right answer is **1 point**, and the most points wins the props prize.",
    "**Tiebreaker:** also guess the **total points** scored by both teams. If people are tied on points, the closest guess wins. If it's still tied, the prize is split.",
    "Props **lock at the Super Bowl kickoff**. Answers are filled in by the commissioner during and after the game.",
    "**Missed kick:** a missed field goal, or a missed or blocked extra point, by either team. A missed 2-point conversion does not count.",
    "**Three in a row:** three scores in a row by the same team with no points from the other team in between. Touchdowns, field goals and safeties all count as scores. An extra point does not count as its own score.",
  ].join("\n"),
  survivor: [
    "Fill each lineup with **one player from each team** in the playoff player pool. Roster size depends on how many teams are playing (8 teams = 8 players, 1 from each team). There are **no salaries or price limits**.",
    "Seats: Wild Card (12 teams) 2 QB, 3 RB, 4 WR, 1 TE, 2 FLEX. Divisional (8 teams) 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX. Conference (4 teams) 1 QB, 1 RB, 1 WR, 1 TE. Super Bowl (2 teams) 2 SUPER FLEX. Every round also has 1 kicker seat.",
    "**Use each player once.** Once you use a player in a lineup, you can't use that player again for the rest of the playoffs.",
    "Submit your entire lineup **before the start of the first game each weekend**. Scores are updated by the commissioner.",
    "Each round is **weighted**: Wild Card x1.00, Divisional x1.33, Conference x2.33, Super Bowl x3.33. The person with the most points at the end wins.",
    "**Position players** (QB, RB, WR, TE) use DraftKings DFS scoring.",
    "**Kicker:** each round, pick one team you think will have the best kicking performance (field goals and PATs). There is no limit to how many times you can use a team.",
    "Kicker scoring: made FG 1-49 yards = 0.07 per yard + 1. Made FG 50+ yards = 0.11 per yard. Missed FG = (100 - yards) x -0.025. Made PAT +1. Failed PAT -2. Longest FG +3. Game-winning FG +2.",
  ].join("\n"),
  dk: [
    "Lobbies are set up in **DraftKings** for each slate. Normal in-season roster and salary rules apply.",
    "The person with the **largest cumulative total points** (not including Survivor) wins.",
    "**Tiebreaker:** ties go to the person with the higher Survivor score.",
  ].join("\n"),
};

// Saved text from the admin page, or the original rules if nothing is saved.
export async function getRules(kind: RuleKind): Promise<string> {
  const saved = await getSetting(`rules_${kind}`);
  return saved.trim() ? saved : DEFAULT_RULES[kind];
}
