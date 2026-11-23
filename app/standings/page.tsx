import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadStandings } from "@/lib/standingsData";
import RankBadge from "@/components/RankBadge";

export const dynamic = "force-dynamic";

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

export default async function StandingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { rows } = await loadStandings(me.id);

const heads = ["Survivor", "Pick'em", "DK"];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-1 font-mono text-xs text-black/40">postseason / standings</div>
      <h1 className="font-display text-3xl">Standings</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        Where everyone ranks in each contest. Each contest keeps its own winner. Tied people share a rank. The list is ordered by average rank.
      </p>

      {rows.length === 0 ? (
        <div className="border border-grid bg-panel px-4 py-8 text-center text-sm text-black/50">No one has joined yet.</div>
      ) : (
        <div className="overflow-x-auto border border-grid bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="row-line font-mono text-[10px] uppercase tracking-wide text-black/40">
                <th className="px-4 py-2 text-left font-normal">name</th>
                {heads.map((h) => (
                  <th key={h} className="px-3 py-2 text-center font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mine = r.id === me.id;
                return (
                  <tr key={r.id} className={`row-line border-l-2 ${mine ? "border-l-turf bg-turf/5" : "border-l-transparent"}`}>
                    <td className={`px-4 py-2.5 ${mine ? "font-semibold" : ""}`}>{r.name}</td>
                    {r.ranks.map((rk, i) => (
                      <td key={i} className="px-3 py-2">
                        <div className="flex flex-col items-center gap-0.5">
                          <RankBadge rank={rk} />
                          <span className="font-mono text-[10px] text-black/40">{fmt(r.scores[i])}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
