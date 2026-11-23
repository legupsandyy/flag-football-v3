import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { kickerPoints, round2 } from "@/lib/scoring";
import RankBadge from "@/components/RankBadge";

export const dynamic = "force-dynamic";

const ORDER = ["QB", "RB", "WR", "TE", "FLEX", "SUPER FLEX", "KICK"];

function textOn(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.65 ? "#1a1a1a" : "#ffffff";
}

function Chip({ name, color }: { name: string; color: string }) {
  return (
    <span className="rounded-sm px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: color, color: textOn(color) }}>
      {name}
    </span>
  );
}

export default async function LineupsPage({ params }: { params: { roundId: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const round = await prisma.round.findUnique({ where: { id: params.roundId } });
  if (!round) notFound();

  const back = (
    <Link href={`/survivor/${round.id}`} className="mb-3 inline-flex items-center gap-1 font-mono text-xs text-black/50 hover:text-turf">
      <ChevronLeft size={14} /> {round.label}
    </Link>
  );

  // Lineups stay hidden until the round locks, so nobody can copy a pick.
  if (new Date() < round.lockTime) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        {back}
        <h1 className="font-display text-3xl">{round.label} lineups</h1>
        <div className="mt-6 flex items-center gap-2 border border-grid bg-panel px-4 py-8 text-sm text-black/50">
          <Lock size={14} /> Everyone&apos;s lineups show up here once the round locks.
        </div>
      </div>
    );
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const picks = await prisma.survivorPick.findMany({
    where: { slot: { roundId: round.id } },
    include: { slot: true, player: { include: { team: true } } },
  });
  const teams = await prisma.team.findMany();
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const kStats = await prisma.kickerStat.findMany({ where: { roundId: round.id } });
  const kickerScore = new Map<string, number>(
    kStats.map((s) => [
      s.teamId,
      kickerPoints({
        fgMade: JSON.parse(s.fgMade),
        fgMissed: JSON.parse(s.fgMissed),
        patMade: s.patMade,
        patFailed: s.patFailed,
        longest: s.longest,
        gameWinner: s.gameWinner,
      }),
    ])
  );

  const lineups = users
    .map((u) => {
      const mine = picks
        .filter((p) => p.userId === u.id)
        .sort((a, b) => {
          const pa = ORDER.indexOf(a.slot.position);
          const pb = ORDER.indexOf(b.slot.position);
          return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb) || a.slot.index - b.slot.index;
        })
        .map((p) => {
          if (p.kickTeamId) {
            const t = teamById.get(p.kickTeamId);
            return {
              id: p.id,
              pos: "K",
              label: "Kicker",
              teamName: t?.name ?? p.kickTeamId.toUpperCase(),
              color: t?.color ?? "#999999",
              pts: kickerScore.get(p.kickTeamId) ?? 0,
            };
          }
          return {
            id: p.id,
            pos: p.slot.position === "SUPER FLEX" ? "S-FLEX" : p.slot.position,
            label: p.player?.name ?? "—",
            teamName: p.player?.team.name ?? "",
            color: p.player?.team.color ?? "#999999",
            pts: p.player?.dkPoints ?? 0,
          };
        });
      const raw = mine.reduce((s, x) => s + x.pts, 0);
      return { id: u.id, name: u.name, picks: mine, total: round2(raw * round.multiplier) };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  let lastTotal: number | null = null;
  let lastRank = 0;
  const ranked = lineups.map((l, i) => {
    if (l.total !== lastTotal) {
      lastRank = i + 1;
      lastTotal = l.total;
    }
    return { ...l, rank: lastRank };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {back}
      <h1 className="font-display text-3xl">{round.label} lineups</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        Everyone&apos;s locked roster, ranked by round score (×{round.multiplier.toFixed(2)}). Tap a name to open their lineup.
      </p>

      <div className="space-y-2">
        {ranked.map((l) => (
          <details key={l.id} className={`group border bg-panel ${l.id === me.id ? "border-turf/50" : "border-grid"}`} open={l.id === me.id}>
            <summary className="flex cursor-pointer select-none items-center gap-3 px-4 py-3">
              <RankBadge rank={l.rank} />
              <span className={`min-w-0 flex-1 truncate ${l.id === me.id ? "font-semibold" : ""}`}>{l.name}</span>
              <span className="font-display text-xl text-turf">{l.total.toFixed(2)}</span>
            </summary>
            <div className="border-t border-grid">
              {l.picks.length === 0 ? (
                <div className="px-4 py-3 text-sm text-black/40">No lineup submitted.</div>
              ) : (
                l.picks.map((p) => (
                  <div
                    key={p.id}
                    className="row-line flex items-center gap-3 px-3 py-2 text-sm last:border-b-0"
                    style={{ borderLeft: `6px solid ${p.color}` }}
                  >
                    <span className="w-12 shrink-0 font-mono text-[10px] uppercase text-black/50">{p.pos}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.label}</div>
                      <div className="mt-0.5">
                        <Chip name={p.teamName} color={p.color} />
                      </div>
                    </div>
                    <span className="font-mono text-xs text-amber">{p.pts > 0 ? p.pts.toFixed(2) : "—"}</span>
                  </div>
                ))
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
