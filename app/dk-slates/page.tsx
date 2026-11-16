import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DkSlatesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [slates, users] = await Promise.all([
    prisma.dkSlate.findMany({ orderBy: { createdAt: "asc" }, include: { scores: true } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  type Row = { id: string; name: string; per: (number | null)[]; total: number; rank: number };

  const ranked: Row[] = users.map((u) => {
    const per = slates.map((s) => s.scores.find((x) => x.userId === u.id)?.points ?? null);
    const total = per.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    return { id: u.id, name: u.name, per, total, rank: 0 };
  });
  ranked.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  // People tied on points share a rank number.
  for (let i = 0; i < ranked.length; i++) {
    ranked[i].rank = i > 0 && ranked[i].total === ranked[i - 1].total ? ranked[i - 1].rank : i + 1;
  }

  const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

  return (
    <div className="px-5 py-8 max-w-3xl mx-auto">
      <div className="font-mono text-xs text-black/40 mb-1">postseason / dk-slates</div>
      <h1 className="font-display text-2xl mb-1">DK Slates</h1>
      <p className="text-black/50 text-sm mb-6">
        Real DraftKings contest scores, entered by the commissioner after each slate. Totals add up across slates.
      </p>

      {slates.length === 0 ? (
        <div className="border border-grid bg-panel px-4 py-6 text-sm text-black/50">
          No slates yet. Scores will show up here after the first DraftKings slate.
        </div>
      ) : (
        <div className="border border-grid bg-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="row-line font-mono text-[11px] uppercase tracking-wide text-black/40">
                <th className="text-left font-normal px-3 py-2 w-8">#</th>
                <th className="text-left font-normal px-3 py-2">name</th>
                {slates.map((s) => (
                  <th key={s.id} className="text-right font-normal px-3 py-2 whitespace-nowrap">
                    {s.label}
                  </th>
                ))}
                <th className="text-right font-normal px-3 py-2">total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.id} className={`row-line last:border-b-0 ${r.id === me.id ? "bg-turf/5" : ""}`}>
                  <td className="px-3 py-2 font-mono text-black/40">{r.rank}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.name}</td>
                  {r.per.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right font-mono text-xs text-black/60">
                      {v === null ? "—" : fmt(v)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
