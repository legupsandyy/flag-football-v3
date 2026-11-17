import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadPickem } from "@/lib/pickemData";
import PickBoard from "@/components/PickBoard";
import SuperBowlPick from "@/components/SuperBowlPick";
import PickemLeaderboard from "@/components/PickemLeaderboard";
import RulesBox from "@/components/RulesBox";

export const dynamic = "force-dynamic";

export default async function AtsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const data = await loadPickem("ats", me.id);

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto">
      <div className="font-mono text-xs text-black/40 mb-1">postseason / ats</div>
      <h1 className="font-display text-2xl mb-1">ATS Pick&apos;em</h1>
      <p className="text-black/50 text-sm mb-6">
        Pick every game against the spread. 1 point for a correct pick, 0 for a push. Picks lock at each game&apos;s kickoff.
      </p>

      <RulesBox>
        <ul>
          <li>Spread pick&apos;em: pick who you believe will <strong>cover the spread</strong>.</li>
          <li>You must submit your pick <strong>before the start of each game</strong>.</li>
          <li>One correct pick is <strong>1 point</strong>. If your pick pushes, it counts as <strong>0 points</strong>.</li>
          <li>
            <strong>Super Bowl pick:</strong> before Wild Card weekend begins, choose who you think wins the Super Bowl. If your team wins, it adds
            <strong> 4 points</strong> to your running total.
          </li>
          <li>
            <strong>Tiebreaker:</strong> ties go to the person with the highest individual DK slate score.
          </li>
        </ul>
      </RulesBox>

      <SuperBowlPick
        teams={data.playoffTeams}
        initial={data.mySbPick}
        locked={data.sbLocked}
        winner={data.sbWinner}
      />

      <h2 className="mb-2 font-display text-lg">Standings</h2>
      <div className="mb-10">
        <PickemLeaderboard rows={data.rows} meId={me.id} extraLabel="SB pick" />
      </div>

      <PickBoard kind="ats" slates={data.slates} />
    </div>
  );
}
