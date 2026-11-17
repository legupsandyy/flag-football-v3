import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import RankBadge from "@/components/RankBadge";

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-1 font-mono text-xs text-black/40">dk slates</div>
      <h1 className="font-display text-3xl">DK Slates</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        Real DraftKings contest scores, entered by the commissioner after each slate. Totals add up across slates.
      </p>

      {slates.length === 0 ? (
        <div className="border border-grid bg-panel px-4 py-8 text-center text-sm text-black/50">
          No slates yet. Scores will show up here after the first DraftKings slate.
        </div>
      ) : (
        <div className="overflow-x-auto border border-grid bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="row-line text-left font-mono text-[10px] uppercase tracking-wide text-black/40">
                <th className="sticky left-0 bg-panel px-3 py-2 font-normal">player</th>
                {slates.map((s) => (
                  <th key={s.id} className="whitespace-nowrap px-3 py-2 text-right font-normal">
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-normal">total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const mine = r.id === me.id;
                return (
                  <tr key={r.id} className={`row-line last:border-b-0 ${mine ? "bg-turf/5" : ""}`}>
                    <td className={`sticky left-0 px-3 py-2.5 ${mine ? "bg-[#eef5f3]" : "bg-panel"}`}>
                      <div className="flex items-center gap-2.5">
                        <RankBadge rank={r.rank} />
                        <span className={`max-w-[120px] truncate ${mine ? "font-semibold" : ""}`}>{r.name}</span>
                      </div>
                    </td>
                    {r.per.map((v, i) => (
                      <td key={i} className="px-3 py-2.5 text-right font-mono text-xs text-black/50">
                        {v === null ? "—" : fmt(v)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-turf">{fmt(r.total)}</td>
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
