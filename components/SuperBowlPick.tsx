"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

export default function SuperBowlPick({
  teams,
  initial,
  locked,
  winner,
}: {
  teams: string[];
  initial: string | null;
  locked: boolean;
  winner: string;
}) {
  const [team, setTeam] = useState(initial ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  async function choose(value: string) {
    const before = team;
    setTeam(value);
    setMsg(null);
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "superbowl", team: value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setTeam(before);
      setMsg(data.error ?? "Couldn't save. Try again.");
    } else {
      setMsg("Saved.");
    }
  }

  return (
    <div className="mb-8 border border-amber/40 bg-amber/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-display text-sm">
          <Trophy size={15} className="text-amber" /> Super Bowl winner
        </div>
        <div className="font-mono text-[11px] text-black/50">4 pts</div>
      </div>

      {teams.length === 0 ? (
        <div className="text-sm text-black/50 mt-2">The playoff teams haven&apos;t been added yet.</div>
      ) : (
        <>
          <select
            value={team}
            disabled={locked}
            onChange={(e) => choose(e.target.value)}
            className="mt-2 min-h-[44px] w-full border border-grid bg-panel px-3 py-2 text-base font-mono outline-none focus:border-turf disabled:opacity-70"
          >
            <option value="" disabled>
              Choose a team…
            </option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="mt-1 font-mono text-[11px] text-black/40">
            {locked ? "locked" : "locks at the first Wild Card kickoff"}
          </div>
          {winner && (
            <div className="mt-1 font-mono text-xs">
              Champion: {winner} {team && (team === winner ? "— you got it, +4" : "— not your pick")}
            </div>
          )}
          {msg && <div className="mt-1 font-mono text-[11px] text-turf">{msg}</div>}
        </>
      )}
    </div>
  );
}
