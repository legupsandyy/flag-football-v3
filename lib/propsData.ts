import { prisma } from "./db";
import { getSetting } from "./settings";
import { PROP_QUESTIONS, optionsFor } from "./props";

export type PropsRow = { userId: string; name: string; correct: number; diff: number | null; guess: number | null };

export type PropsData = {
  hasGame: boolean;
  away: string;
  home: string;
  kickoff: string | null;
  locked: boolean;
  questions: {
    id: string;
    text: string;
    options: { value: string; label: string }[];
    myPick: string | null;
    answer: string | null; // correct answer once the commissioner sets it
    others: { label: string; names: string[] }[]; // only after the lock
  }[];
  myTotal: number | null;
  finalTotal: number | null;
  graded: number; // how many questions have an answer so far
  rows: PropsRow[];
};

export async function loadProps(meId: string): Promise<PropsData> {
  const game = await prisma.game.findFirst({ where: { slateId: "sb" }, orderBy: { kickoff: "asc" } });
  const users = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const picks = await prisma.propPick.findMany();

  let key: { answers?: Record<string, string>; total?: number | null } = {};
  try {
    key = JSON.parse((await getSetting("propAnswers")) || "{}");
  } catch {
    key = {};
  }
  const answers = key.answers ?? {};
  const finalTotal = typeof key.total === "number" ? key.total : null;

  const away = game?.awayTeam ?? "Team A";
  const home = game?.homeTeam ?? "Team B";
  const locked = game ? new Date() >= game.kickoff : false;
  const nameOf = new Map(users.map((u) => [u.id, u.name] as const));

  const questions = PROP_QUESTIONS.map((q) => {
    const options = optionsFor(q, away, home);
    const mine = picks.find((p) => p.userId === meId && p.qid === q.id)?.answer ?? null;
    const others = locked
      ? options.map((o) => ({
          label: o.label,
          names: picks
            .filter((p) => p.qid === q.id && p.answer === o.value)
            .map((p) => nameOf.get(p.userId) ?? "?")
            .sort((a, b) => a.localeCompare(b)),
        }))
      : [];
    return { id: q.id, text: q.text, options, myPick: mine, answer: answers[q.id] ?? null, others };
  });

  const guessOf = (userId: string) => {
    const g = picks.find((p) => p.userId === userId && p.qid === "total")?.answer;
    const n = g === undefined ? NaN : Number(g);
    return Number.isFinite(n) ? n : null;
  };

  const rows: PropsRow[] = users
    .map((u) => {
      let correct = 0;
      for (const q of PROP_QUESTIONS) {
        const a = answers[q.id];
        if (a && picks.some((p) => p.userId === u.id && p.qid === q.id && p.answer === a)) correct++;
      }
      const guess = guessOf(u.id);
      return { userId: u.id, name: u.name, correct, guess, diff: finalTotal !== null && guess !== null ? Math.abs(guess - finalTotal) : null };
    })
    .sort(
      (a, b) =>
        b.correct - a.correct ||
        (a.diff ?? Infinity) - (b.diff ?? Infinity) ||
        a.name.localeCompare(b.name)
    );

  return {
    hasGame: !!game,
    away,
    home,
    kickoff: game ? game.kickoff.toISOString() : null,
    locked,
    questions,
    myTotal: guessOf(meId),
    finalTotal,
    graded: Object.keys(answers).length,
    rows,
  };
}
