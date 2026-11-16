"use client";

import { useEffect, useState, useCallback } from "react";
import { Lock, ChevronRight, X } from "lucide-react";

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

export default function RosterBuilder({ roundId }: { roundId: string }) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/survivor/state?roundId=${roundId}`)
      .then((r) => r.json())
      .then(setState);
  }, [roundId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!state) return <div className="px-5 py-8 text-black/30 text-sm font-mono">loading…</div>;
  if ("error" in (state as any)) {
    return <div className="px-5 py-8 text-black/30 text-sm font-mono">{(state as any).error}</div>;
  }

  const { round, slots, players, kickerScores } = state;

  const takenInRoster = new Set(slots.map((s) => s.pick?.player?.id).filter(Boolean));

  async function choosePlayer(playerId: string) {
    if (!pickerSlot) return;
    await submitPick({ slotId: pickerSlot.id, playerId });
  }
  async function chooseTeam(teamId: string) {
    if (!pickerSlot) return;
    await submitPick({ slotId: pickerSlot.id, kickTeamId: teamId });
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

  const eligiblePlayers = pickerSlot
    ? players.filter((p) => {
        if (takenInRoster.has(p.id) && p.id !== pickerSlot.pick?.player?.id) return false;
        if (pickerSlot.position === "FLEX" || pickerSlot.position === "SUPER FLEX") return true;
        return p.pos === pickerSlot.position;
      })
    : [];

  return (
    <div className="px-5 py-6 max-w-lg mx-auto">
      <div className="font-mono text-xs text-black/40 mb-1">postseason / survivor / {round.id}</div>
      <div className="flex items-center justify-between mb-1 row-line pb-3">
        <h1 className="font-display text-xl">{round.label}</h1>
        <span className="font-mono text-sm text-amber">×{round.multiplier.toFixed(2)}</span>
      </div>
      {round.locked && (
        <div className="flex items-center gap-1.5 text-xs text-black/40 mt-3 font-mono">
          <Lock size={12} /> locked — roster is final for this round
        </div>
      )}

      {error && (
        <div className="mt-3 border border-turf/40 bg-turf/5 px-3 py-2 text-sm text-turf font-mono">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-2 mt-4 font-mono">
        <span className="text-xs uppercase tracking-wide text-black/50">roster</span>
        <span className="text-xs text-black/40">{filledCount}/{slots.length} filled</span>
      </div>

      <div className="border border-grid">
        {slots.map((s) => (
          <button
            key={s.id}
            disabled={round.locked || saving}
            onClick={() => setPickerSlot(s)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left row-line last:border-b-0 hover:bg-black/[0.03] transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] w-16 text-turf uppercase tracking-wider">{s.position}</span>
              {s.position === "KICK" ? (
                s.pick?.kickTeamId ? (
                  <span className="text-sm font-medium">{s.pick.kickTeamId.toUpperCase()}</span>
                ) : (
                  <span className="text-sm text-black/30">select team</span>
                )
              ) : s.pick?.player ? (
                <div>
                  <div className="text-sm font-medium">{s.pick.player.name}</div>
                  <div className="text-[11px] text-black/40">{s.pick.player.teamName}</div>
                </div>
              ) : (
                <span className="text-sm text-black/30">select player</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {s.pick && (
                <span className="font-mono text-sm text-amber">
                  {s.position === "KICK"
                    ? (kickerScores[s.pick.kickTeamId ?? ""] ?? 0).toFixed(2)
                    : (s.pick.player?.dkPoints ?? 0).toFixed(2)}
                </span>
              )}
              {!round.locked && <ChevronRight size={14} className="text-black/20" />}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border border-turf/30 bg-turf/5 px-4 py-3">
        <div>
          <div className="text-[11px] text-black/50 uppercase tracking-wide font-mono">
            raw {rawTotal.toFixed(2)} × {round.multiplier.toFixed(2)}
          </div>
          <div className="font-display text-lg">Round Total</div>
        </div>
        <span className="font-mono text-2xl text-turf">{roundTotal.toFixed(2)}</span>
      </div>

      {pickerSlot && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="bg-panel border border-grid w-full sm:max-w-sm max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-panel flex items-center justify-between px-4 py-3 row-line">
              <span className="font-mono text-xs uppercase tracking-wide text-black/60">
                {pickerSlot.position === "KICK" ? "select team" : `select ${pickerSlot.position.toLowerCase()}`}
              </span>
              <button onClick={() => setPickerSlot(null)}>
                <X size={16} className="text-black/40" />
              </button>
            </div>
            <div>
              {pickerSlot.position === "KICK"
                ? round.teamIds.map((tid) => (
                    <button
                      key={tid}
                      onClick={() => chooseTeam(tid)}
                      className="w-full flex items-center justify-between px-4 py-2.5 row-line last:border-b-0 hover:bg-black/[0.03] text-left"
                    >
                      <span className="text-sm">{tid.toUpperCase()}</span>
                      <span className="font-mono text-xs text-amber">{(kickerScores[tid] ?? 0).toFixed(2)}</span>
                    </button>
                  ))
                : eligiblePlayers.length === 0 ? (
                    <p className="text-sm text-black/30 px-3 py-6 text-center font-mono">no eligible players left for this slot</p>
                  ) : (
                    eligiblePlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => choosePlayer(p.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 row-line last:border-b-0 hover:bg-black/[0.03] text-left"
                      >
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-[11px] text-black/40">{p.pos} · {p.teamName}</div>
                        </div>
                        <span className="font-mono text-xs text-amber">{p.dkPoints.toFixed(2)}</span>
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
