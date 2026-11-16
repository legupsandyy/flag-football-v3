"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GameForm, { AdminGame } from "./GameForm";
import DkSection, { DkSlateAdmin } from "./DkSection";
import SurvivorAdmin, { RoundAdmin, PlayerAdmin, KickerAdmin } from "./SurvivorAdmin";

type AdminSlate = { id: string; label: string; salamiLine: number | null; games: AdminGame[] };
type Member = { id: string; name: string };

const input = "w-full border border-grid bg-panel px-2 py-1.5 text-sm font-mono outline-none focus:border-turf";
const btn =
  "border border-turf text-turf px-3 py-1.5 text-sm font-mono hover:bg-turf hover:text-white transition-colors disabled:opacity-50";

async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data.error as string | undefined };
}

function SettingsBox({ playoffTeams, superBowlWinner }: { playoffTeams: string; superBowlWinner: string }) {
  const router = useRouter();
  const [teams, setTeams] = useState(playoffTeams);
  const [winner, setWinner] = useState(superBowlWinner);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const r = await call({ action: "saveSettings", playoffTeams: teams, superBowlWinner: winner });
    setMsg(r.ok ? "Saved." : r.error ?? "Couldn't save.");
    if (r.ok) router.refresh();
  }

  return (
    <div className="border border-grid bg-panel p-3 space-y-3">
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-black/50 mb-0.5">
          playoff teams (one per line) — fills the Super Bowl pick list
        </label>
        <textarea className={input} rows={7} value={teams} onChange={(e) => setTeams(e.target.value)} />
      </div>
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-black/50 mb-0.5">
          Super Bowl champion (fill in at the very end, typed exactly like the list above)
        </label>
        <input className={input} value={winner} onChange={(e) => setWinner(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} className={btn}>
          save
        </button>
        {msg && <span className="font-mono text-xs text-turf">{msg}</span>}
      </div>
    </div>
  );
}

function SalamiBox({ slate }: { slate: AdminSlate }) {
  const router = useRouter();
  const [line, setLine] = useState(slate.salamiLine === null ? "" : String(slate.salamiLine));
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const r = await call({ action: "saveSlate", id: slate.id, salamiLine: line });
    setMsg(r.ok ? "Saved." : r.error ?? "Couldn't save.");
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex items-end gap-2">
      <div className="w-40">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-black/50 mb-0.5">
          grand salami line
        </label>
        <input className={input} inputMode="decimal" value={line} onChange={(e) => setLine(e.target.value)} placeholder="e.g. 280.5" />
      </div>
      <button onClick={save} className={btn}>
        save
      </button>
      {msg && <span className="font-mono text-xs text-turf pb-2">{msg}</span>}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  async function remove() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    const r = await call({ action: "deleteUser", id: member.id });
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex items-center justify-between row-line last:border-b-0 px-3 py-2 text-sm">
      <span>{member.name}</span>
      <button
        onClick={remove}
        className="border border-grid px-2 py-1 text-xs font-mono text-black/50 hover:border-amber hover:text-amber transition-colors"
      >
        {confirm ? "tap again to remove" : "remove"}
      </button>
    </div>
  );
}

export default function AdminPanel({
  slates,
  members,
  playoffTeams,
  superBowlWinner,
  dkSlates,
  survivor,
}: {
  survivor: { teamIds: string[]; rounds: RoundAdmin[]; players: PlayerAdmin[]; kickers: KickerAdmin[] };
  dkSlates: DkSlateAdmin[];
  slates: AdminSlate[];
  members: Member[];
  playoffTeams: string;
  superBowlWinner: string;
}) {
  // Wait until the page is in the browser so times show in the admin's own time zone.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-base mb-2">Playoff teams &amp; champion</h2>
        <SettingsBox playoffTeams={playoffTeams} superBowlWinner={superBowlWinner} />
      </section>

      {slates.map((s) => (
        <section key={s.id}>
          <h2 className="font-display text-base mb-2">{s.label}</h2>
          <div className="space-y-3">
            <SalamiBox slate={s} />
            {s.games.map((g) => (
              <GameForm key={g.id + g.kickoff} slateId={s.id} game={g} />
            ))}
            <GameForm slateId={s.id} />
          </div>
        </section>
      ))}

      <section>
        <h2 className="font-display text-base mb-1">Survivor</h2>
        <p className="text-xs text-black/50 mb-2">Set up the teams, rounds and players, then enter scores as games finish.</p>
        <SurvivorAdmin {...survivor} />
      </section>

      <section>
        <h2 className="font-display text-base mb-1">DK Slates</h2>
        <p className="text-xs text-black/50 mb-2">
          Add a slate for each real DraftKings contest, then type in everyone&apos;s score. Leave a box blank if someone didn&apos;t play.
        </p>
        <DkSection slates={dkSlates} members={members} />
      </section>

      <section>
        <h2 className="font-display text-base mb-2">Members ({members.length})</h2>
        <div className="border border-grid bg-panel">
          {members.length === 0 ? (
            <div className="px-3 py-3 text-sm text-black/40">No one has joined yet.</div>
          ) : (
            members.map((m) => <MemberRow key={m.id} member={m} />)
          )}
        </div>
      </section>
    </div>
  );
}
