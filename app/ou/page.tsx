import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadPickem } from "@/lib/pickemData";
import PickBoard from "@/components/PickBoard";
import PickemLeaderboard from "@/components/PickemLeaderboard";

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
        Over or under on each game&apos;s total. 1 point for a correct pick, 0.5 for a push. The Grand Salami for each
        round is worth 3 points (1.5 on a push). Picks lock at kickoff; the Grand Salami locks at the round&apos;s first kickoff.
      </p>

      <h2 className="mb-2 font-display text-lg">Standings</h2>
      <div className="mb-10">
        <PickemLeaderboard rows={data.rows} meId={me.id} />
      </div>

      <PickBoard kind="ou" slates={data.slates} />
    </div>
  );
}
