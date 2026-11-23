// The Super Bowl props game: 10 questions + a tiebreaker guess of the game's total points.

export type PropKind = "team" | "yesno" | "type";
export type PropQuestion = { id: string; text: string; kind: PropKind };

export const PROP_QUESTIONS: PropQuestion[] = [
  { id: "q1", text: "Which team scores first?", kind: "team" },
  { id: "q2", text: "Which team scores last?", kind: "team" },
  { id: "q3", text: "Which team wins the coin toss?", kind: "team" },
  { id: "q4", text: "Will there be a missed extra point or field goal?", kind: "yesno" },
  { id: "q5", text: "Will the first score be a touchdown or a field goal?", kind: "type" },
  { id: "q6", text: "Which QB throws for more passing yards?", kind: "team" },
  { id: "q7", text: "Which team has the leading rusher?", kind: "team" },
  { id: "q8", text: "Will there be a defensive or special teams touchdown?", kind: "yesno" },
  { id: "q9", text: "Will there be a successful 2-point conversion?", kind: "yesno" },
  { id: "q10", text: "Will either team score 3 times in a row without the other team scoring?", kind: "yesno" },
];

export type PropOption = { value: string; label: string };

export function optionsFor(q: PropQuestion, away: string, home: string): PropOption[] {
  if (q.kind === "team")
    return [
      { value: "away", label: away },
      { value: "home", label: home },
    ];
  if (q.kind === "yesno")
    return [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ];
  return [
    { value: "td", label: "Touchdown" },
    { value: "fg", label: "Field goal" },
  ];
}

export function validAnswer(q: PropQuestion, answer: string) {
  return optionsFor(q, "", "").some((o) => o.value === answer);
}
