import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadPickem } from "@/lib/pickemData";
import PickBoard from "@/components/PickBoard";
import SuperBowlPick from "@/components/SuperBowlPick";
import PickemLeaderboard from "@/components/PickemLeaderboard";

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
