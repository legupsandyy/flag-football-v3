import Link from "next/link";
import { Lock, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import Leaderboard from "@/components/Leaderboard";
import LocalTime from "@/components/LocalTime";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SurvivorHub() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const rounds = await prisma.round.findMany({ orderBy: { order: "asc" } });
  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-1 font-mono text-xs text-black/40">survivor</div>
      <h1 className="font-display text-3xl">Survivor</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        One roster per round, drawn from the teams still playing. A player can only be used once, and points grow each round.
      </p>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rounds.map((r) => {
          const ready = (JSON.parse(r.teamIds) as string[]).length > 0;
          const locked = ready && now >= r.lockTime;
          return (
            <Link
              key={r.id}
              href={`/survivor/${r.id}`}
              className="group flex flex-col justify-between border border-grid bg-panel p-3 transition-colors hover:border-turf/50"
            >
              <div className="flex items-start justify-between">
                <div className="font-display text-base">{r.label}</div>
                <span className="font-mono text-sm font-semibold text-amber">×{r.multiplier.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-black/50">
                {!ready ? (
                  <span>not set up yet</span>
                ) : locked ? (
                  <span className="flex items-center gap-1">
                    <Lock size={11} /> locked
                  </span>
                ) : (
                  <span className="text-turf">
                    open · <LocalTime iso={r.lockTime.toISOString()} />
                  </span>
                )}
                <ChevronRight size={14} className="shrink-0 text-black/20 group-hover:text-turf" />
              </div>
            </Link>
          );
        })}
      </div>

      <Leaderboard />
    </div>
  );
}
