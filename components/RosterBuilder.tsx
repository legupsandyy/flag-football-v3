"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Lock, Clock, X, Plus, Search, ChevronLeft } from "lucide-react";
import LocalTime from "./LocalTime";

interface Player {
  id: string;
  name: string;
  pos: string;
  teamId: string;
  teamName: string;
  dkPoints: number;
}
interface Slot {
  id: string;
  position: string;
  index: number;
  pick: { player: Player | null; kickTeamId: string | null } | null;
}
interface StateResponse {
  round: { id: string; label: string; multiplier: number; lockTime: string; locked: boolean; teamIds: string[] };
  slots: Slot[];
  players: Player[];
  kickerScores: Record<string, number>;
}

const CHIP: Record<string, string> = {
  QB: "border-turf/40 text-turf",
  RB: "border-turf/40 text-turf",
  WR: "border-turf/40 text-turf",
  TE: "border-turf/40 text-turf",
  FLEX: "border-ink2/30 text-ink2/70",
  "SUPER FLEX": "border-ink2/30 text-ink2/70",
  KICK: "border-amber/50 text-amber",
};

export default function RosterBuilder({ roundId }: { roundId: string }) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    fetch(`/api/survivor/state?roundId=${roundId}`)
      .then((r) => r.json())
      .then(setState);
  }, [roundId]);

  useEffect(() => {
    load();
  }, [load]);

  const eligiblePlayers = useMemo(() => {
    if (!state || !pickerSlot) return [];
    const taken = new Set(state.slots.map((s) => s.pick?.player?.id).filter(Boolean));
    const q = query.trim().toLowerCase();
    return state.players.filter((p) => {
      if (taken.has(p.id) && p.id !== pickerSlot.pick?.player?.id) return false;
      if (!(pickerSlot.position === "FLEX" || pickerSlot.position === "SUPER FLEX") && p.pos !== pickerSlot.position) {
        return false;
      }
      return !q || p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q);
    });
  }, [state, pickerSlot, query]);

  if (!state) return <div className="px-4 py-8 font-mono text-sm text-black/30">loading…</div>;
  if ("error" in (state as any)) {
    return <div className="px-4 py-8 font-mono text-sm text-black/30">{(state as any).error}</div>;
  }

  const { round, slots, kickerScores } = state;

  function openPicker(s: Slot) {
    setQuery("");
    setError(null);
    setPickerSlot(s);
  }

  async function submitPick(body: { slotId: string; playerId?: string; kickTeamId?: string }) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/survivor/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't save that pick");
      return;
    }
    setPickerSlot(null);
    load();
  }

  const rawTotal = slots.reduce((sum, s) => {
    if (s.position === "KICK") return sum + (s.pick?.kickTeamId ? kickerScores[s.pick.kickTeamId] ?? 0 : 0);
    return sum + (s.pick?.player?.dkPoints ?? 0);
  }, 0);
  const roundTotal = Math.round(rawTotal * round.multiplier * 100) / 100;
  const filledCount = slots.filter((s) => s.pick).length;
  const pct = slots.length ? Math.round((filledCount / slots.length) * 100) : 0;
  const empty = slots.length <= 1; // only the kick seat = round not set up yet

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link href="/survivor" className="mb-3 inline-flex items-center gap-1 font-mono text-xs text-black/40 hover:text-turf">
        <ChevronLeft size={14} /> survivor
      </Link>

      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl">{round.label}</h1>
        <span className="mb-1 bg-amber/15 px-2 py-0.5 font-mono text-sm font-semibold text-amber">
          ×{round.multiplier.toFixed(2)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-black/50">
        {round.locked ? (
          <>
            <Lock size={12} /> locked — roster is final for this round
          </>
        ) : (
          <>
            <Clock size={12} /> locks <LocalTime iso={round.lockTime} />
          </>
        )}
      </div>

      {empty ? (
        <div className="mt-6 border border-grid bg-panel px-4 py-8 text-center text-sm text-black/50">
          This round isn&apos;t set up yet. Check back once the matchups are in.
        </div>
      ) : (
        <>
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-black/50">
              <span>roster</span>
              <span>
                {filledCount}/{slots.length} filled
              </span>
            </div>
            <div className="h-1 bg-black/10">
              <div className="h-1 bg-turf transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="mt-3 border border-grid bg-panel">
            {slots.map((s) => {
              const pts =
                s.position === "KICK" ? kickerScores[s.pick?.kickTeamId ?? ""] ?? 0 : s.pick?.player?.dkPoints ?? 0;
              return (
                <button
                  key={s.id}
                  disabled={round.locked || saving}
                  onClick={() => openPicker(s)}
                  className="row-line flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-black/[0.03] active:bg-turf/5 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span
                    className={`w-14 shrink-0 border px-1 py-0.5 text-center font-mono text-[10px] uppercase tracking-wider ${
                      CHIP[s.position] ?? CHIP.FLEX
                    }`}
                  >
                    {s.position === "SUPER FLEX" ? "S-FLEX" : s.position}
                  </span>

                  <div className="min-w-0 flex-1">
                    {s.position === "KICK" ? (
                      s.pick?.kickTeamId ? (
                        <div className="text-[15px] font-semibold">{s.pick.kickTeamId.toUpperCase()} kicker</div>
                      ) : (
                        <PlaceholderText locked={round.locked} text="pick a kicker's team" />
                      )
                    ) : s.pick?.player ? (
                      <>
                        <div className="truncate text-[15px] font-semibold">{s.pick.player.name}</div>
                        <div className="text-xs text-black/40">{s.pick.player.teamName}</div>
                      </>
                    ) : (
                      <PlaceholderText locked={round.locked} text="pick a player" />
                    )}
                  </div>

                  {s.pick && (
                    <span className="font-mono text-sm font-semibold text-amber">{pts > 0 ? pts.toFixed(2) : "—"}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-30 mt-4 flex items-center justify-between border border-turf/40 bg-[#eef5f3] px-4 py-3 shadow-sm sm:bottom-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-black/50">
                raw {rawTotal.toFixed(2)} × {round.multiplier.toFixed(2)}
              </div>
              <div className="font-display text-base">Round total</div>
            </div>
            <span className="font-display text-3xl text-turf">{roundTotal.toFixed(2)}</span>
          </div>
        </>
      )}

      {pickerSlot && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="flex max-h-[80vh] w-full flex-col border border-grid bg-panel sm:max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-line flex items-center justify-between px-4 py-3">
              <span className="font-mono text-xs uppercase tracking-wide text-black/60">
                {pickerSlot.position === "KICK" ? "choose a team's kicker" : `choose a ${pickerSlot.position.toLowerCase()}`}
              </span>
              <button onClick={() => setPickerSlot(null)} aria-label="close" className="p-1">
                <X size={18} className="text-black/40" />
              </button>
            </div>

            {error && <div className="border-b border-brick/30 bg-brick/10 px-4 py-2 font-mono text-xs text-brick">{error}</div>}

            {pickerSlot.position !== "KICK" && (
              <div className="row-line flex items-center gap-2 px-4 py-2">
                <Search size={15} className="text-black/30" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search name or team"
                  className="w-full bg-transparent py-1 text-base outline-none placeholder:text-black/30"
                />
              </div>
            )}

            <div className="overflow-y-auto">
              {pickerSlot.position === "KICK" ? (
                round.teamIds.map((tid) => (
                  <button
                    key={tid}
                    onClick={() => submitPick({ slotId: pickerSlot.id, kickTeamId: tid })}
                    className="row-line flex min-h-[52px] w-full items-center justify-between px-4 py-2 text-left last:border-b-0 hover:bg-black/[0.03] active:bg-turf/5"
                  >
                    <span className="text-[15px] font-medium">{tid.toUpperCase()}</span>
                    <span className="font-mono text-xs text-amber">
                      {(kickerScores[tid] ?? 0) > 0 ? (kickerScores[tid] ?? 0).toFixed(2) : ""}
                    </span>
                  </button>
                ))
              ) : eligiblePlayers.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-sm text-black/30">no players available</p>
              ) : (
                eligiblePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => submitPick({ slotId: pickerSlot.id, playerId: p.id })}
                    className="row-line flex min-h-[52px] w-full items-center justify-between px-4 py-2 text-left last:border-b-0 hover:bg-black/[0.03] active:bg-turf/5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium">{p.name}</div>
                      <div className="text-xs text-black/40">
                        {p.pos} · {p.teamName}
                      </div>
                    </div>
                    {p.dkPoints > 0 && <span className="font-mono text-xs text-amber">{p.dkPoints.toFixed(2)}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderText({ locked, text }: { locked: boolean; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-black/30">
      {!locked && <Plus size={14} />}
      {locked ? "no pick made" : text}
    </span>
  );
}
