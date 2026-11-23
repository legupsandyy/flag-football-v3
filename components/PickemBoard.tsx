"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Lock } from "lucide-react";
import LocalTime from "./LocalTime";
import { spreadLabel } from "@/lib/pickem";
import { findTeam } from "@/lib/teamMatch";
import type { CombinedSlate, CombinedGame } from "@/lib/pickemCombined";
import { Option, ResultChip, TeamName, Others, finalLine } from "./PickBoard";

export default function PickemBoard({ slates }: { slates: CombinedSlate[] }) {
  // Local copy of picks so a tap shows up instantly.
  const [picks, setPicks] = useState<Record<string, string | null>>(() => {
    const m: Record<string, string | null> = {};
    for (const s of slates) {
      m[`salami:${s.id}`] = s.salamiPick;
      for (const g of s.games) {
        m[`ats:${g.id}`] = g.ats.myPick;
        m[`ou:${g.id}`] = g.ou.myPick;
      }
    }
    return m;
  });
  const [error, setError] = useState<string | null>(null);

  async function send(key: string, body: Record<string, unknown>) {
    const before = picks[key] ?? null;
    setPicks((p) => ({ ...p, [key]: String(body.side) }));
    setError(null);
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPicks((p) => ({ ...p, [key]: before }));
      setError(data.error ?? "Couldn't save that pick. Try again.");
    }
  }

  const populated = slates.filter((s) => s.games.length > 0);
  if (populated.length === 0) {
    return (
      <div className="border border-grid bg-panel px-4 py-8 text-center text-sm text-black/50">
        No games yet. They&apos;ll show up here once the playoff matchups are set.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {error && (
        <div className="sticky top-16 z-30 border border-brick/40 bg-brick/10 px-3 py-2 font-mono text-sm text-brick">{error}</div>
      )}

      {populated.map((s) => {
        const picked = s.games.reduce(
          (n, g) => n + (picks[`ats:${g.id}`] ? 1 : 0) + (picks[`ou:${g.id}`] ? 1 : 0),
          0
        );
        const showSalami = s.id !== "sb" && s.salamiLine !== null;
        return (
          <section key={s.id}>
            <div className="mb-3 flex items-baseline justify-between border-b border-grid pb-2">
              <h2 className="font-display text-lg">{s.label}</h2>
              <span className="font-mono text-xs text-black/40">
                {picked}/{s.games.length * 2} picks made
              </span>
            </div>

            {showSalami && (
              <div className="mb-4 border border-grid bg-panel p-4">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-sm">Grand Salami</div>
                    <div className="text-xs text-black/50">
                      Combined score of all {s.games.length} games · 3 pts (1.5 on a push)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ResultChip result={s.salamiResult} />
                    <span className="font-display text-xl text-turf">{s.salamiLine}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["over", "under"].map((side) => (
                    <Option
                      key={side}
                      selected={picks[`salami:${s.id}`] === side}
                      locked={s.salamiLocked}
                      result={s.salamiResult}
                      onClick={() => send(`salami:${s.id}`, { kind: "salami", slateId: s.id, side })}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-sm font-semibold uppercase">
                        {side === "over" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        {side}
                      </div>
                      <div className="font-mono text-[11px] opacity-70">{s.salamiLine}</div>
                    </Option>
                  ))}
                </div>
                {s.salamiLocked && <div className="mt-2 font-mono text-[11px] text-black/40">locked</div>}
                <Others groups={s.salamiOthers} />
              </div>
            )}

            <div className="space-y-4">
              {s.games.map((g: CombinedGame) => {
                const atsPick = picks[`ats:${g.id}`] ?? null;
                const ouPick = picks[`ou:${g.id}`] ?? null;
                const others = [
                  ...g.ats.others.map((o) => ({ label: `Spread · ${o.label}`, names: o.names })),
                  ...g.ou.others.map((o) => ({ label: `Total · ${o.label}`, names: o.names })),
                ];
                return (
                  <div key={g.id} className="border border-grid bg-panel p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-black/50">
                        <LocalTime iso={g.kickoff} />
                      </div>
                      <div>
                        {g.isFinal ? (
                          <span className="font-mono text-xs font-semibold text-black/70">
                            final {g.awayScore}–{g.homeScore}
                          </span>
                        ) : g.locked ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-amber">
                            <Lock size={11} /> locked
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase tracking-wide text-turf">open</span>
                        )}
                      </div>
                    </div>

                    {/* Spread pick */}
                    <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wide text-black/40">
                      <span>Spread</span>
                      <ResultChip result={g.ats.result} />
                    </div>
                    <div className="flex gap-2">
                      {(["away", "home"] as const).map((side) => (
                        <Option
                          key={side}
                          selected={atsPick === side}
                          locked={g.locked}
                          result={g.ats.result}
                          onClick={() => send(`ats:${g.id}`, { kind: "ats", gameId: g.id, side })}
                          stripe={findTeam(side === "away" ? g.away : g.home)?.color}
                        >
                          <TeamName className="pr-5 text-[15px] font-semibold" name={side === "away" ? g.away : g.home} />
                          <div className="font-mono text-sm opacity-80">{spreadLabel(g.homeSpread, side)}</div>
                        </Option>
                      ))}
                    </div>

                    {/* Over / under pick */}
                    <div className="mb-1.5 mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-wide text-black/40">
                      <span>Total · {g.total}</span>
                      <ResultChip result={g.ou.result} />
                    </div>
                    <div className="flex gap-2">
                      {["over", "under"].map((side) => (
                        <Option
                          key={side}
                          selected={ouPick === side}
                          locked={g.locked}
                          result={g.ou.result}
                          onClick={() => send(`ou:${g.id}`, { kind: "ou", gameId: g.id, side })}
                        >
                          <div className="flex items-center gap-1.5 font-mono text-sm font-semibold uppercase">
                            {side === "over" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {side}
                          </div>
                          <div className="font-mono text-[11px] opacity-70">{g.total}</div>
                        </Option>
                      ))}
                    </div>

                    {finalLine("ats", g) && (
                      <div className="mt-3 space-y-0.5 border-t border-grid pt-2 font-mono text-xs text-black/60">
                        <div>{finalLine("ats", g)}</div>
                        <div>{finalLine("ou", g)}</div>
                      </div>
                    )}
                    {g.locked && (!atsPick || !ouPick) && (
                      <div className="mt-2 font-mono text-xs text-black/40">
                        {!atsPick && !ouPick ? "no picks made" : !atsPick ? "no spread pick made" : "no over/under pick made"}
                      </div>
                    )}
                    <Others groups={others} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
