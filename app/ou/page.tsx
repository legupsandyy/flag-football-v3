import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadPickem } from "@/lib/pickemData";
import PickBoard from "@/components/PickBoard";
import PickemLeaderboard from "@/components/PickemLeaderboard";
import RulesBox from "@/components/RulesBox";

export const dynamic = "force-dynamic";

export default async function OuPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const data = await loadPickem("ou", me.id);

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto">
      <div className="font-mono text-xs text-black/40 mb-1">postseason / o-u</div>
      <h1 className="font-display text-2xl mb-1">O/U Pick&apos;em</h1>
      <p className="text-black/50 text-sm mb-6">
        Over or under on each game&apos;s total, plus a Grand Salami for each round (except the Super Bowl).
      </p>

      <RulesBox>
        <ul>
          <li>
            <strong>Game picks:</strong> for each game, choose whether more or fewer points will be scored than the listed total. You must submit your pick
            <strong> before the start of each game</strong>.
          </li>
          <li>
            One correct pick is <strong>1 point</strong>. If your pick pushes, it counts as <strong>0.5 points</strong>.
          </li>
          <li>
            <strong>Grand Salami:</strong> the Grand Salami is the posted total of the combined scores of every team in every game that round. Pick Over or Under
            on it. A correct Grand Salami pick earns <strong>3 points</strong> toward your O/U total. It is not played for the Super Bowl, since that is a
            stand-alone game.
          </li>
          <li>
            <strong>Tiebreaker:</strong> ties go to the person with the highest individual Survivor slate score.
          </li>
        </ul>
      </RulesBox>

      <h2 className="mb-2 font-display text-lg">Standings</h2>
      <div className="mb-10">
        <PickemLeaderboard rows={data.rows} meId={me.id} />
      </div>

      <PickBoard kind="ou" slates={data.slates} />
    </div>
  );
}
