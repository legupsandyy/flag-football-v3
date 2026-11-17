// Rank number with a little emphasis for the top three.
export default function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-amber text-white"
      : rank === 2
      ? "bg-black/70 text-white"
      : rank === 3
      ? "bg-amber/25 text-amber"
      : "text-black/40";
  return (
    <span className={`grid h-6 w-6 shrink-0 place-items-center font-mono text-xs font-semibold ${style}`}>{rank}</span>
  );
}
