import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const CONTESTS = [
  { href: "/survivor", label: "Survivor", desc: "Weighted draft pool, one roster per round." },
  { href: "/ats", label: "ATS Pick'em", desc: "Pick every game against the spread." },
  { href: "/ou", label: "O/U Pick'em", desc: "Over or under, plus the Grand Salami." },
  { href: "/dk-slates", label: "DK Slates", desc: "Real DraftKings contest scores, logged by round." },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="px-5 py-8 max-w-2xl mx-auto">
      <div className="font-mono text-xs text-black/40 mb-1">postseason / overview</div>
      <h1 className="font-display text-2xl mb-1">Postseason Tournament</h1>
      <p className="text-black/50 text-sm mb-8">
        {user ? `Signed in as ${user.name}.` : "Sign in to start entering picks."}
      </p>

      <div className="border border-grid">
        {CONTESTS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-center justify-between row-line px-4 py-3 hover:bg-black/[0.03] transition-colors last:border-b-0"
          >
            <div>
              <div className="font-display text-sm">{c.label}</div>
              <div className="text-black/40 text-xs mt-0.5">{c.desc}</div>
            </div>
            <span className="font-mono text-black/20 text-xs">→</span>
          </Link>
        ))}
      </div>

      {!user && (
        <Link
          href="/login"
          className="inline-block mt-6 border border-turf text-turf px-4 py-2 text-sm font-mono hover:bg-turf hover:text-white transition-colors"
        >
          sign_in
        </Link>
      )}
    </div>
  );
}
