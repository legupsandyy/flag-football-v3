import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadStandings } from "@/lib/standingsData";
import { loadRoundWinners } from "@/lib/roundWinners";
import { getPayouts, PAYOUT_KEYS, PAYOUT_LABELS, prizeName, money, PayoutKey } from "@/lib/payouts";

export const dynamic = "force-dynamic";

// Which column of the standings each contest uses (Survivor, Pick'em, DK).
const RANK_INDEX: Partial<Record<PayoutKey, number>> = { survivor: 0, pickem: 1, dk: 2 };

export default async function PayoutsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const config = await getPayouts();
  const players = await prisma.user.count();
  const standings = await loadStandings(me.id);
  const roundWinners = await loadRoundWinners();

  const perPerson = PAYOUT_KEYS.reduce((sum, k) => sum + config[k].buyIn, 0);

  function leaders(key: PayoutKey, place: number): string | null {
    if (key === "rounds") {
      const w = roundWinners[place];
      if (!w || w.names.length === 0) return null;
      return `${w.names.join(", ")} (${w.final ? "winner" : "currently"})`;
    }
    const idx = RANK_INDEX[key];
    if (idx === undefined || !standings.started[idx]) return null;
    const names = standings.rows.filter((r) => r.ranks[idx] === place + 1).map((r) => r.name);
    return names.length ? names.join(", ") : null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-1 font-mono text-xs text-black/40">postseason / payouts</div>
      <h1 className="font-display text-3xl">Payouts</h1>
      <p className="mb-8 mt-1 text-sm text-black/50">
        {money(perPerson)} buy-in per person · {players} {players === 1 ? "player" : "players"} · {money(perPerson * players)} total pot
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PAYOUT_KEYS.map((k) => {
          const c = config[k];
          return (
            <div key={k} className="border border-grid bg-panel p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-display text-lg">{PAYOUT_LABELS[k]}</div>
                <div className="font-mono text-xs text-black/40">{money(c.buyIn)} buy-in</div>
              </div>
              <div className="mb-3 mt-0.5 font-mono text-xs text-black/40">{money(c.buyIn * players)} pot</div>
              <div>
                {c.prizes.map((amount, i) => {
                  const who = leaders(k, i);
                  return (
                    <div key={i} className="row-line flex items-center justify-between gap-3 py-2 last:border-b-0">
                      <div className="min-w-0">
                        <div className="text-sm">{prizeName(k, i)}</div>
                        {who && <div className="truncate text-xs text-turf">{k === "rounds" ? who : `${who} (currently)`}</div>}
                      </div>
                      <div className="font-display text-lg text-turf">{money(amount)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-black/40">
        Ties split the prize for the places they share. Round winner prizes skip the Super Bowl round.
      </p>
    </div>
  );
}
