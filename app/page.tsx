import Link from "next/link";
import { Flame, Target, ArrowUpDown, Coins, Clock, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getNextUp } from "@/lib/nextUp";
import { SITE_NAME } from "@/lib/site";
import LocalTime from "@/components/LocalTime";
import Countdown from "@/components/Countdown";

export const dynamic = "force-dynamic";

const CONTESTS = [
  { href: "/survivor", label: "Survivor", desc: "Build a roster each round. Points grow every round.", icon: Flame },
  { href: "/ats", label: "ATS Pick'em", desc: "Pick every game against the spread.", icon: Target },
  { href: "/ou", label: "O/U Pick'em", desc: "Over or under, plus the Grand Salami.", icon: ArrowUpDown },
  { href: "/dk-slates", label: "DK Slates", desc: "Real DraftKings contest scores by slate.", icon: Coins },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const next = user ? await getNextUp() : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-1 font-mono text-xs text-black/40">overview</div>
      <h1 className="font-display text-2xl leading-tight sm:text-3xl">{SITE_NAME}</h1>
      <p className="mb-6 mt-1 text-sm text-black/50">
        {user ? `Signed in as ${user.name}.` : "Join with the group password to start entering picks."}
      </p>

      {next && (
        <div className="mb-6 flex items-center gap-3 border border-amber/40 bg-amber/5 px-4 py-3">
          <Clock size={18} className="shrink-0 text-amber" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-wide text-amber">next lock</div>
            <div className="truncate text-sm font-medium">{next.label}</div>
            <div className="font-mono text-xs text-black/50">
              <LocalTime iso={next.iso} />
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wide text-black/40">in</div>
            <div className="font-display text-xl text-amber">
              <Countdown iso={next.iso} />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {CONTESTS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex items-center gap-4 border border-grid bg-panel p-4 transition-colors hover:border-turf/50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-turf/10 text-turf transition-colors group-hover:bg-turf group-hover:text-white">
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base">{c.label}</div>
                <div className="text-xs text-black/50">{c.desc}</div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-black/20 transition-colors group-hover:text-turf" />
            </Link>
          );
        })}
      </div>

      {!user && (
        <Link
          href="/login"
          className="mt-6 inline-block border border-turf bg-turf px-5 py-2.5 font-mono text-sm text-white transition-colors hover:bg-turf/90"
        >
          join the tournament
        </Link>
      )}
    </div>
  );
}
