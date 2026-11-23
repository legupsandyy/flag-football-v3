import { loadSurvivorScores } from "./survivorScores";
import { getPayouts } from "./payouts";
import { getSetting } from "./settings";

export const PRIZE_ROUNDS = ["wc", "div", "conf"]; // the Super Bowl round has no round prize

export type RoundWinner = {
  roundId: string;
  label: string;
  names: string[]; // everyone tied for the top score (empty until someone has points)
  score: number;
  prize: number; // total prize for the round
  each: number; // prize split between tied winners
  final: boolean; // commissioner marked the round done
};

export async function loadRoundWinners(): Promise<RoundWinner[]> {
  const { rounds, table } = await loadSurvivorScores();
  const payouts = await getPayouts();
  const out: RoundWinner[] = [];
  for (let i = 0; i < PRIZE_ROUNDS.length; i++) {
    const id = PRIZE_ROUNDS[i];
    const round = rounds.find((r) => r.id === id);
    if (!round) continue;
    const top = Math.max(0, ...table.map((t) => t.perRound[id] ?? 0));
    const names = top > 0 ? table.filter((t) => (t.perRound[id] ?? 0) === top).map((t) => t.name).sort() : [];
    const prize = payouts.rounds.prizes[i] ?? 0;
    out.push({
      roundId: id,
      label: round.label,
      names,
      score: top,
      prize,
      each: names.length ? Math.round((prize / names.length) * 100) / 100 : prize,
      final: (await getSetting(`roundFinal_${id}`)) === "1",
    });
  }
  return out;
}
