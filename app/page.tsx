import Link from "next/link";
import { Flame, Target, ArrowUpDown, Coins, Clock, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getNextUp } from "@/lib/nextUp";
import { loadStandings } from "@/lib/standingsData";
import { SITE_NAME } from "@/lib/site";
import LocalTime from "@/components/LocalTime";
import Countdown from "@/components/Countdown";

export const dynamic = "force-dynamic";

// index = position in the standings ranks: Survivor, ATS, O/U, DK
const CONTESTS = [
  { href: "/survivor", label: "Survivor", desc: "Build a roster each round.", icon: Flame, idx: 0 },
  { href: "/ats", label: "ATS Pick'em", desc: "Every game against the spread.", icon: Target, idx: 1 },
  { href: "/ou", label: "O/U Pick'em", desc: "Over or under, plus Grand Salami.", icon: ArrowUpDown, idx: 2 },
  { href: "/dk-slates", label: "DK Slates", desc: "Real DraftKings scores.", icon: Coins, idx: 3 },
];

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const next = user ? await getNextUp() : null;
  let mine: { ranks: number[]; started: boolean[]; count: number } | null = null;
  if (user) {
    try {
      const st = await loadStandings(user.id);
      const row = st.rows.find((r) => r.id === user.id);
      if (row) mine = { ranks: row.ranks, started: st.started, count: st.count };
    } catch {
      mine = null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl leading-tight sm:text-3xl">{SITE_NAME}</h1>
      <p className="mb-8 mt-2 text-sm text-black/50">
        {user ? `Signed in as ${user.name}.` : "Join with the group password to start entering picks."}
      </p>

      {next && (
        <div className="mb-8 flex items-center gap-4 border border-grid bg-panel px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-turf/10 text-turf">
            <Clock size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-wide text-black/40">next lock</div>
            <div className="truncate text-[15px] font-medium">{next.label}</div>
            <div className="font-mono text-xs text-black/50">
              <LocalTime iso={next.iso} />
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wide text-black/40">in</div>
            <div className="font-display text-2xl text-turf">
              <Countdown iso={next.iso} />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {CONTESTS.map((c) => {
          const Icon = c.icon;
          const rank = mine && mine.started[c.idx] ? mine.ranks[c.idx] : null;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-3 border border-grid bg-panel p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-turf/10 text-turf transition-colors group-hover:bg-turf group-hover:text-white">
                  <Icon size={20} />
                </span>
                <ChevronRight size={16} className="text-black/20 transition-colors group-hover:text-turf" />
              </div>
              <div>
                <div className="font-display text-lg">{c.label}</div>
                <div className="text-sm text-black/50">{c.desc}</div>
              </div>
              {mine && (
                <div className="border-t border-grid pt-3 font-mono text-xs text-black/50">
                  {rank ? (
                    <>
                      You&apos;re <span className="font-semibold text-turf">{ordinal(rank)}</span> of {mine.count}
                    </>
                  ) : (
                    "No scores yet"
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {user && (
        <Link
          href="/standings"
          className="mt-6 inline-flex items-center gap-1 font-mono text-xs text-black/50 transition-colors hover:text-turf"
        >
          full standings <ChevronRight size={13} />
        </Link>
      )}

      {!user && (
        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg border border-turf bg-turf px-5 py-2.5 font-mono text-sm text-white transition-colors hover:bg-turf/90"
        >
          join the tournament
        </Link>
      )}
    </div>
  );
}
