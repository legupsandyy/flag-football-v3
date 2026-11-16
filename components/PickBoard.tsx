"use client";

import { useState } from "react";
import LocalTime from "./LocalTime";
import { spreadLabel } from "@/lib/pickem";
import type { SlateView, GameView } from "@/lib/pickemData";

type Kind = "ats" | "ou";

const RESULT_STYLE: Record<string, string> = {
  win: "text-turf border-turf/40 bg-turf/5",
  loss: "text-black/50 border-grid bg-black/[0.03]",
  push: "text-amber border-amber/40 bg-amber/5",
};

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null;
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wide border px-1.5 py-0.5 ${RESULT_STYLE[result]}`}>
      {result}
    </span>
  );
}

function Others({ groups }: { groups: { label: string; names: string[] }[] }) {
  if (groups.length === 0) return null;
  return (
    <details className="mt-2 text-xs text-black/50">
      <summary className="cursor-pointer font-mono">see everyone&apos;s picks</summary>
      <div className="mt-1 space-y-1">
        {groups.map((g) => (
          <div key={g.label}>
            <span className="font-mono text-black/70">{g.label}</span>
            <span className="text-black/40"> ({g.names.length}): </span>
            {g.names.length ? g.names.join(", ") : "—"}
          </div>
        ))}
      </div>
    </details>
  );
}

export default function PickBoard({ kind, slates }: { kind: Kind; slates: SlateView[] }) {
  // Local copy of picks so a tap shows up instantly.
  const [gamePicks, setGamePicks] = useState<Record<string, string | null>>(() => {
    const m: Record<string, string | null> = {};
    for (const s of slates) for (const g of s.games) m[g.id] = g.myPick;
    return m;
  });
  const [salamiPicks, setSalamiPicks] = useState<Record<string, string | null>>(() => {
    const m: Record<string, string | null> = {};
    for (const s of slates) m[s.id] = s.salamiPick;
    return m;
  });
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>, revert: () => void) {
    setError(null);
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      revert();
      setError(data.error ?? "Couldn't save that pick. Try again.");
    }
  }

  function pickGame(g: GameView, side: string) {
    const before = gamePicks[g.id] ?? null;
    setGamePicks((p) => ({ ...p, [g.id]: side }));
    send({ kind, gameId: g.id, side }, () => setGamePicks((p) => ({ ...p, [g.id]: before })));
  }

  function pickSalami(slateId: string, side: string) {
    const before = salamiPicks[slateId] ?? null;
    setSalamiPicks((p) => ({ ...p, [slateId]: side }));
    send({ kind: "salami", slateId, side }, () => setSalamiPicks((p) => ({ ...p, [slateId]: before })));
  }

  const btn = (selected: boolean, disabled: boolean) =>
    `flex-1 border px-3 py-2.5 text-left transition-colors ${
      selected ? "border-turf bg-turf text-white" : "border-grid bg-panel hover:border-turf/60"
    } ${disabled ? "cursor-default opacity-80" : ""}`;

  const populated = slates.filter((s) => s.games.length > 0);

  if (populated.length === 0) {
    return (
      <div className="border border-grid bg-panel px-4 py-6 text-sm text-black/50">
        No games have been added yet. Check back once the playoff matchups are set.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="border border-amber/50 bg-amber/5 px-3 py-2 text-sm text-amber font-mono">{error}</div>
      )}

      {populated.map((s) => (
        <section key={s.id}>
          <h2 className="font-display text-base mb-2">{s.label}</h2>

          {kind === "ou" && s.salamiLine !== null && (
            <div className="border border-amber/40 bg-amber/5 p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-display text-sm">Grand Salami</div>
                  <div className="text-xs text-black/50">
                    Combined score of all {s.games.length} games · line{" "}
                    <span className="font-mono">{s.salamiLine}</span> · 3 pts (1.5 on a push)
                  </div>
                </div>
                <ResultBadge result={s.salamiResult} />
              </div>
              <div className="flex gap-2">
                {["over", "under"].map((side) => (
                  <button
                    key={side}
                    disabled={s.salamiLocked}
                    onClick={() => pickSalami(s.id, side)}
                    className={btn(salamiPicks[s.id] === side, s.salamiLocked)}
                  >
                    <div className="font-mono text-sm capitalize">{side}</div>
                    <div className="font-mono text-[11px] opacity-70">{s.salamiLine}</div>
                  </button>
                ))}
              </div>
              {s.salamiLocked && <div className="mt-1 font-mono text-[11px] text-black/40">locked</div>}
              <Others groups={s.salamiOthers} />
            </div>
          )}

          <div className="space-y-3">
            {s.games.map((g) => {
              const mine = gamePicks[g.id] ?? null;
              return (
                <div key={g.id} className="border border-grid bg-panel p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-[11px] text-black/50">
                      <LocalTime iso={g.kickoff} />
                      {g.locked && !g.isFinal && <span className="ml-2 text-amber">locked</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {g.isFinal && (
                        <span className="font-mono text-xs text-black/60">
                          final {g.awayScore}–{g.homeScore}
                        </span>
                      )}
                      <ResultBadge result={g.result} />
                    </div>
                  </div>

                  {kind === "ats" ? (
                    <div className="flex gap-2">
                      <button disabled={g.locked} onClick={() => pickGame(g, "away")} className={btn(mine === "away", g.locked)}>
                        <div className="text-sm font-medium truncate">{g.away}</div>
                        <div className="font-mono text-xs opacity-70">{spreadLabel(g.homeSpread, "away")}</div>
                      </button>
                      <button disabled={g.locked} onClick={() => pickGame(g, "home")} className={btn(mine === "home", g.locked)}>
                        <div className="text-sm font-medium truncate">{g.home}</div>
                        <div className="font-mono text-xs opacity-70">{spreadLabel(g.homeSpread, "home")}</div>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm mb-2">
                        {g.away} <span className="text-black/30">at</span> {g.home}
                      </div>
                      <div className="flex gap-2">
                        {["over", "under"].map((side) => (
                          <button
                            key={side}
                            disabled={g.locked}
                            onClick={() => pickGame(g, side)}
                            className={btn(mine === side, g.locked)}
                          >
                            <div className="font-mono text-sm capitalize">{side}</div>
                            <div className="font-mono text-[11px] opacity-70">{g.total}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {g.locked && !mine && <div className="mt-2 text-xs text-black/40 font-mono">no pick made</div>}
                  <Others groups={g.others} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
