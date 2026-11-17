"use client";

import { useState } from "react";
import { Check, Lock, ArrowUp, ArrowDown } from "lucide-react";
import LocalTime from "./LocalTime";
import { spreadLabel } from "@/lib/pickem";
import type { SlateView, GameView } from "@/lib/pickemData";

type Kind = "ats" | "ou";

const CHIP: Record<string, string> = {
  win: "bg-turf text-white",
  loss: "bg-brick/10 text-brick",
  push: "bg-amber/15 text-amber",
};

function ResultChip({ result }: { result: string | null }) {
  if (!result) return null;
  return (
    <span className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${CHIP[result]}`}>
      {result}
    </span>
  );
}

function Others({ groups }: { groups: { label: string; names: string[] }[] }) {
  if (groups.length === 0) return null;
  return (
    <details className="mt-3 border-t border-grid pt-2 text-xs text-black/50">
      <summary className="cursor-pointer select-none font-mono">see everyone&apos;s picks</summary>
      <div className="mt-2 space-y-1.5">
        {groups.map((g) => (
          <div key={g.label} className="leading-relaxed">
            <span className="font-mono font-semibold text-black/70">{g.label}</span>
            <span className="text-black/40"> ({g.names.length}) </span>
            {g.names.length ? g.names.join(", ") : "—"}
          </div>
        ))}
      </div>
    </details>
  );
}

// One big tappable option. After a game ends, the chosen option turns green / red / amber.
function Option({
  selected,
  locked,
  result,
  onClick,
  children,
}: {
  selected: boolean;
  locked: boolean;
  result: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  let cls = "border-grid bg-panel hover:border-turf/60 active:bg-turf/5";
  if (selected) {
    cls =
      result === "loss"
        ? "border-brick/50 bg-brick/10 text-brick"
        : result === "push"
        ? "border-amber/60 bg-amber/10 text-amber"
        : "border-turf bg-turf text-white";
  } else if (locked) {
    cls = "border-grid bg-black/[0.02] text-black/40";
  }
  return (
    <button
      disabled={locked}
      onClick={onClick}
      className={`relative min-h-[64px] flex-1 border px-3 py-2.5 text-left transition-colors ${cls} ${
        locked ? "cursor-default" : ""
      }`}
    >
      {children}
      {selected && (
        <span className="absolute right-2 top-2 opacity-90">
          {locked && !result ? <Lock size={13} /> : <Check size={15} strokeWidth={3} />}
        </span>
      )}
    </button>
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
        <div className="sticky top-16 z-30 border border-brick/40 bg-brick/10 px-3 py-2 font-mono text-sm text-brick">
          {error}
        </div>
      )}

      {populated.map((s) => {
        const picked = s.games.filter((g) => gamePicks[g.id]).length;
        return (
          <section key={s.id}>
            <div className="mb-3 flex items-baseline justify-between border-b border-grid pb-2">
              <h2 className="font-display text-lg">{s.label}</h2>
              <span className="font-mono text-xs text-black/40">
                {picked}/{s.games.length} picked
              </span>
            </div>

            {kind === "ou" && s.salamiLine !== null && (
              <div className="mb-3 border border-amber/40 bg-amber/5 p-3">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-sm">Grand Salami</div>
                    <div className="text-xs text-black/50">
                      Combined score of all {s.games.length} games · 3 pts (1.5 on a push)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ResultChip result={s.salamiResult} />
                    <span className="font-display text-xl text-amber">{s.salamiLine}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["over", "under"].map((side) => (
                    <Option
                      key={side}
                      selected={salamiPicks[s.id] === side}
                      locked={s.salamiLocked}
                      result={s.salamiResult}
                      onClick={() => pickSalami(s.id, side)}
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

            <div className="space-y-3">
              {s.games.map((g) => {
                const mine = gamePicks[g.id] ?? null;
                return (
                  <div key={g.id} className="border border-grid bg-panel p-3">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-black/50">
                        <LocalTime iso={g.kickoff} />
                      </div>
                      <div className="flex items-center gap-2">
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
                        <ResultChip result={g.result} />
                      </div>
                    </div>

                    {kind === "ats" ? (
                      <div className="flex gap-2">
                        {(["away", "home"] as const).map((side) => (
                          <Option
                            key={side}
                            selected={mine === side}
                            locked={g.locked}
                            result={g.result}
                            onClick={() => pickGame(g, side)}
                          >
                            <div className="truncate pr-5 text-[15px] font-semibold">{side === "away" ? g.away : g.home}</div>
                            <div className="font-mono text-sm opacity-80">{spreadLabel(g.homeSpread, side)}</div>
                          </Option>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <div className="min-w-0 truncate text-[15px] font-semibold">
                            {g.away} <span className="font-normal text-black/30">at</span> {g.home}
                          </div>
                          <div className="font-mono text-sm text-black/50">O/U {g.total}</div>
                        </div>
                        <div className="flex gap-2">
                          {["over", "under"].map((side) => (
                            <Option
                              key={side}
                              selected={mine === side}
                              locked={g.locked}
                              result={g.result}
                              onClick={() => pickGame(g, side)}
                            >
                              <div className="flex items-center gap-1.5 font-mono text-sm font-semibold uppercase">
                                {side === "over" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                {side}
                              </div>
                              <div className="font-mono text-[11px] opacity-70">{g.total}</div>
                            </Option>
                          ))}
                        </div>
                      </>
                    )}

                    {g.locked && !mine && <div className="mt-2 font-mono text-xs text-black/40">no pick made</div>}
                    <Others groups={g.others} />
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
