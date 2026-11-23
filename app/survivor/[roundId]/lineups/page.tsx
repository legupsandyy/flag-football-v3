import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { kickerPoints, round2 } from "@/lib/scoring";
import { loadSurvivorScores } from "@/lib/survivorScores";
import TeamLogo from "@/components/TeamLogo";
import RankBadge from "@/components/RankBadge";

export const dynamic = "force-dynamic";

const ORDER = ["QB", "RB", "WR", "TE", "FLEX", "SUPER FLEX", "KICK"];

function textOn(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.65 ? "#1a1a1a" : "#ffffff";
}

function Chip({ name, color, teamId }: { name: string; color: string; teamId?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <TeamLogo teamId={teamId} />
      <span className="rounded-sm px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: color, color: textOn(color) }}>
        {name}
      </span>
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
      <div className="mx-auto max-w-3xl px-4 py-10">
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
              teamId: p.kickTeamId,
              teamName: t?.name ?? p.kickTeamId.toUpperCase(),
              color: t?.color ?? "#999999",
              pts: kickerScore.get(p.kickTeamId) ?? 0,
            };
          }
          return {
            id: p.id,
            pos: p.slot.position === "SUPER FLEX" ? "S-FLEX" : p.slot.position,
            label: p.player?.name ?? "—",
            teamId: p.player?.teamId ?? "",
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

  // ---- Recap cards ----
  type Card = { title: string; main: string; sub: string };
  const cards: Card[] = [];
  const anyScores = lineups.some((l) => l.total !== 0);
  if (anyScores) {
    const top = ranked[0];
    cards.push({ title: "Round winner", main: top.name, sub: `${top.total.toFixed(2)} pts` });

    // Player picks (not kickers), counted across all lineups.
    const byPlayer = new Map<string, { name: string; team: string; pts: number; count: number }>();
    for (const p of picks) {
      if (!p.player) continue;
      const cur = byPlayer.get(p.player.id) ?? { name: p.player.name, team: p.player.team.name, pts: p.player.dkPoints, count: 0 };
      cur.count++;
      byPlayer.set(p.player.id, cur);
    }
    const players = Array.from(byPlayer.values());
    if (players.length) {
      const best = [...players].sort((a, b) => b.pts - a.pts)[0];
      cards.push({ title: "Best pick", main: best.name, sub: `${best.pts.toFixed(2)} pts · ${best.team} · in ${best.count} lineup${best.count === 1 ? "" : "s"}` });
      const popular = [...players].sort((a, b) => b.count - a.count || b.pts - a.pts)[0];
      cards.push({ title: "Most picked", main: popular.name, sub: `in ${popular.count} lineup${popular.count === 1 ? "" : "s"} · ${popular.pts.toFixed(2)} pts` });
      const bust = [...players].filter((p) => p.count >= 2).sort((a, b) => a.pts - b.pts || b.count - a.count)[0];
      if (bust) cards.push({ title: "Biggest bust", main: bust.name, sub: `${bust.pts.toFixed(2)} pts · picked by ${bust.count}` });
    }

    // Who climbed the most in the overall Survivor standings this round.
    const sv = await loadSurvivorScores();
    const idx = sv.rounds.findIndex((r) => r.id === round.id);
    if (idx > 0) {
      const rankAfter = (upTo: number) => {
        const totals = sv.table.map((t) => ({
          id: t.userId,
          total: sv.rounds.slice(0, upTo + 1).reduce((sum, r) => sum + (t.perRound[r.id] ?? 0), 0),
        }));
        totals.sort((a, b) => b.total - a.total);
        const m = new Map<string, number>();
        let lastT: number | null = null;
        let lastR = 0;
        totals.forEach((t, i) => {
          if (t.total !== lastT) {
            lastR = i + 1;
            lastT = t.total;
          }
          m.set(t.id, lastR);
        });
        return m;
      };
      const before = rankAfter(idx - 1);
      const after = rankAfter(idx);
      let bestMove = { name: "", gain: 0, from: 0, to: 0 };
      for (const u of users) {
        const from = before.get(u.id) ?? 0;
        const to = after.get(u.id) ?? 0;
        if (from - to > bestMove.gain) bestMove = { name: u.name, gain: from - to, from, to };
      }
      if (bestMove.gain > 0) {
        cards.push({ title: "Biggest climb", main: bestMove.name, sub: `up ${bestMove.gain} spot${bestMove.gain === 1 ? "" : "s"} (${bestMove.from} → ${bestMove.to})` });
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {back}
      <h1 className="font-display text-3xl">{round.label} lineups</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        Everyone&apos;s locked roster, ranked by round score (×{round.multiplier.toFixed(2)}). Tap a name to open their lineup.
      </p>

      {cards.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="border border-grid bg-panel p-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-turf">{c.title}</div>
              <div className="mt-1 truncate font-display text-lg">{c.main}</div>
              <div className="mt-0.5 text-xs text-black/50">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

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
                        <Chip name={p.teamName} color={p.color} teamId={p.teamId} />
                      </div>
                    </div>
                    <span className="font-mono text-xs text-ink2/70">{p.pts > 0 ? p.pts.toFixed(2) : "—"}</span>
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
