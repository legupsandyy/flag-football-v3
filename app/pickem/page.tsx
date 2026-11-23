import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadPickemCombined } from "@/lib/pickemCombined";
import PickemBoard from "@/components/PickemBoard";
import SuperBowlPick from "@/components/SuperBowlPick";
import PickemLeaderboard from "@/components/PickemLeaderboard";
import RulesBlock from "@/components/RulesBlock";

export const dynamic = "force-dynamic";

export default async function PickemPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const data = await loadPickemCombined(me.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-1 font-mono text-xs text-black/40">postseason / pick&apos;em</div>
      <h1 className="font-display text-3xl">Pick&apos;em</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        Two picks on every game: against the spread and over/under. Picks lock at each game&apos;s kickoff.
      </p>

      <RulesBlock kind="pickem" />

      <SuperBowlPick teams={data.playoffTeams} initial={data.mySbPick} locked={data.sbLocked} winner={data.sbWinner} />

      <h2 className="mb-2 font-display text-lg">Standings</h2>
      <div className="mb-10">
        <PickemLeaderboard rows={data.rows} meId={me.id} extraLabel="SB pick" />
      </div>

      <PickemBoard slates={data.slates} />
    </div>
  );
}
