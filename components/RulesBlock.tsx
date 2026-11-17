import { getRules, RuleKind } from "@/lib/rules";
import RulesBox from "./RulesBox";

function renderLine(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default async function RulesBlock({ kind, defaultOpen = true }: { kind: RuleKind; defaultOpen?: boolean }) {
  const text = await getRules(kind);
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\s*[-•]\s+/, "").trim())
    .filter(Boolean);
  return (
    <RulesBox defaultOpen={defaultOpen}>
      <ul>
        {lines.map((l, i) => (
          <li key={i}>{renderLine(l)}</li>
        ))}
      </ul>
    </RulesBox>
  );
}
