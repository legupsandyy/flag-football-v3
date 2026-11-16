"use client";

import { useRouter } from "next/navigation";
import { useState, ReactNode } from "react";
import { NFL_TEAMS } from "@/lib/nflTeams";
import { aggregateMix, defaultPositionMix, kickerPoints, round2 } from "@/lib/scoring";

export type RoundAdmin = { id: string; label: string; lockTime: string; multiplier: number; teamIds: string[] };
export type PlayerAdmin = { id: string; name: string; pos: string; teamId: string; dkPoints: number };
export type KickerAdmin = {
  teamId: string;
  roundId: string;
  fgMade: string;
  fgMissed: string;
  patMade: number;
  patFailed: number;
  longest: boolean;
  gameWinner: boolean;
};

const input = "w-full border border-grid bg-panel px-2 py-1.5 text-sm font-mono outline-none focus:border-turf";
const lab = "block font-mono text-[10px] uppercase tracking-wide text-black/50 mb-0.5";
const btn =
  "border border-turf text-turf px-3 py-1.5 text-sm font-mono hover:bg-turf hover:text-white transition-colors disabled:opacity-50";
const ghost =
  "border border-grid px-3 py-1.5 text-sm font-mono text-black/50 hover:border-amber hover:text-amber transition-colors";

const teamName = (id: string) => NFL_TEAMS.find((t) => t.id === id)?.name ?? id;

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Step({ n, title, hint, open, children }: { n: number; title: string; hint: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="border border-grid bg-panel">
      <summary className="cursor-pointer px-3 py-2.5">
        <span className="font-mono text-xs text-turf mr-2">{n}.</span>
        <span className="font-display text-sm">{title}</span>
        <div className="text-xs text-black/50 mt-0.5 ml-5">{hint}</div>
      </summary>
      <div className="px-3 pb-3 pt-2 border-t border-grid space-y-3">{children}</div>
    </details>
  );
}

function Msg({ m }: { m: { text: string; ok: boolean } | null }) {
  if (!m) return null;
  return <span className={`font-mono text-xs ${m.ok ? "text-turf" : "text-amber"}`}>{m.text}</span>;
}

// ---- 1. Teams --------------------------------------------------------------
function TeamsStep({ teamIds }: { teamIds: string[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>(teamIds);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await post({ action: "saveSurvivorTeams", teamIds: sel });
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.data.error ?? "Couldn't save.", ok: false });
    setMsg({ text: "Saved.", ok: true });
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
        {NFL_TEAMS.map((t) => (
          <label key={t.id} className="flex items-center gap-2 text-sm py-0.5">
            <input type="checkbox" checked={sel.includes(t.id)} onChange={() => toggle(t.id)} />
            {t.name}
          </label>
        ))}
      </div>
      <p className="text-xs text-black/50">
        Ticked: {sel.length}. Unticking a team removes its players and any picks that used them.
      </p>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className={btn}>
          save teams
        </button>
        <Msg m={msg} />
      </div>
    </>
  );
}

// ---- 2. Rounds -------------------------------------------------------------
function RoundCard({ round, allTeamIds }: { round: RoundAdmin; allTeamIds: string[] }) {
  const router = useRouter();
  const [lock, setLock] = useState(toLocalInput(round.lockTime));
  const [mult, setMult] = useState(String(round.multiplier));
  const [sel, setSel] = useState<string[]>(round.teamIds);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const seats = [...aggregateMix(defaultPositionMix(sel.length)).map((g) => `${g.pos} ${g.count}`), "KICK 1"].join(" · ");

  async function save() {
    setMsg(null);
    const d = new Date(lock);
    if (isNaN(d.getTime())) return setMsg({ text: "Enter the lock date and time.", ok: false });
    const r = await post({ action: "saveRound", id: round.id, lockTime: d.toISOString(), multiplier: mult, teamIds: sel });
    if (!r.ok) return setMsg({ text: r.data.error ?? "Couldn't save.", ok: false });
    setMsg({ text: "Saved.", ok: true });
    router.refresh();
  }

  return (
    <div className="border border-grid p-3 space-y-3">
      <div className="font-display text-sm">{round.label}</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className={lab}>locks at (your time zone) — first kickoff of the round</label>
          <input type="datetime-local" className={input} value={lock} onChange={(e) => setLock(e.target.value)} />
        </div>
        <div>
          <label className={lab}>multiplier</label>
          <input className={input} inputMode="decimal" value={mult} onChange={(e) => setMult(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={lab}>teams playing this round</label>
        {allTeamIds.length === 0 ? (
          <div className="text-sm text-black/40">Set up the playoff teams in step 1 first.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
            {allTeamIds.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm py-0.5">
                <input type="checkbox" checked={sel.includes(id)} onChange={() => toggle(id)} />
                {teamName(id)}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs text-black/50 font-mono">
        {sel.length} teams → seats: {seats}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} className={btn}>
          save round
        </button>
        <Msg m={msg} />
      </div>
    </div>
  );
}

// ---- 3. Players ------------------------------------------------------------
function AddPlayers({ hasPlayers }: { hasPlayers: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);

  async function add() {
    setMsg(null);
    setProblems([]);
    const r = await post({ action: "addPlayers", text });
    if (!r.ok) return setMsg({ text: r.data.error ?? "Couldn't add.", ok: false });
    setProblems(r.data.problems ?? []);
    setMsg({ text: `Added ${r.data.added} player${r.data.added === 1 ? "" : "s"}.`, ok: true });
    if (!(r.data.problems ?? []).length) setText("");
    router.refresh();
  }

  async function clearAll() {
    if (!confirm) return setConfirm(true);
    const r = await post({ action: "clearSurvivorSample" });
    setConfirm(false);
    if (!r.ok) return setMsg({ text: r.data.error ?? "Couldn't clear.", ok: false });
    setMsg({ text: "Cleared.", ok: true });
    router.refresh();
  }

  return (
    <>
      <div>
        <label className={lab}>paste players, one per line: Name, Position, Team</label>
        <textarea
          className={input}
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Patrick Mahomes, QB, Chiefs\nIsiah Pacheco, RB, Chiefs\nTravis Kelce, TE, KC"}
        />
        <p className="text-xs text-black/50 mt-1">Positions: QB, RB, WR, TE. Team can be the name (Chiefs) or short code (KC). Adding the same player twice just updates them.</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={add} className={btn}>
          add players
        </button>
        <Msg m={msg} />
      </div>
      {problems.length > 0 && (
        <div className="border border-amber/50 bg-amber/5 px-3 py-2 text-xs font-mono text-amber space-y-1">
          <div>These lines were skipped:</div>
          {problems.map((p, i) => (
            <div key={i}>{p}</div>
          ))}
        </div>
      )}
      {hasPlayers && (
        <div className="border-t border-grid pt-3">
          <button onClick={clearAll} className={ghost}>
            {confirm ? "tap again — this deletes ALL players, scores and Survivor picks" : "clear all players & Survivor picks"}
          </button>
          <p className="text-xs text-black/40 mt-1">Use this once to wipe the sample players before loading the real ones.</p>
        </div>
      )}
    </>
  );
}

// ---- 4. Player scores --------------------------------------------------------
function PlayerRow({ p, value, onChange }: { p: PlayerAdmin; value: string; onChange: (v: string) => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  async function remove() {
    if (!confirm) return setConfirm(true);
    const r = await post({ action: "deletePlayer", id: p.id });
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-2 row-line last:border-b-0 px-3 py-1.5">
      <span className="font-mono text-[11px] text-black/40 w-7">{p.pos}</span>
      <span className="flex-1 text-sm truncate">{p.name}</span>
      <input
        className="w-20 border border-grid bg-panel px-2 py-1 text-sm font-mono text-right outline-none focus:border-turf"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={remove} className="text-xs font-mono text-black/40 hover:text-amber w-16 text-right">
        {confirm ? "sure?" : "remove"}
      </button>
    </div>
  );
}

function ScoresStep({ players }: { players: PlayerAdmin[] }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((p) => [p.id, String(p.dkPoints)]))
  );
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const teamIds = Array.from(new Set(players.map((p) => p.teamId))).sort((a, b) => teamName(a).localeCompare(teamName(b)));

  async function save() {
    setMsg(null);
    const changed = players.filter((p) => (Number(vals[p.id]) || 0) !== p.dkPoints);
    if (changed.length === 0) return setMsg({ text: "Nothing changed.", ok: true });
    const r = await post({ action: "savePlayerPoints", points: changed.map((p) => ({ id: p.id, dk: vals[p.id] })) });
    if (!r.ok) return setMsg({ text: r.data.error ?? "Couldn't save.", ok: false });
    setMsg({ text: `Saved ${changed.length}.`, ok: true });
    router.refresh();
  }

  if (players.length === 0) return <div className="text-sm text-black/40">Add players in step 3 first.</div>;

  return (
    <>
      <p className="text-xs text-black/50">
        Type each player&apos;s DraftKings fantasy points after their game. Everyone who picked that player gets the same number. Leave 0 until the game is played.
      </p>
      {teamIds.map((tid) => (
        <div key={tid}>
          <div className="font-mono text-[11px] uppercase tracking-wide text-black/50 mb-1">{teamName(tid)}</div>
          <div className="border border-grid">
            {players
              .filter((p) => p.teamId === tid)
              .map((p) => (
                <PlayerRow key={p.id} p={p} value={vals[p.id] ?? ""} onChange={(v) => setVals((s) => ({ ...s, [p.id]: v }))} />
              ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={save} className={btn}>
          save scores
        </button>
        <Msg m={msg} />
      </div>
    </>
  );
}

// ---- 5. Kickers --------------------------------------------------------------
function KickerRow({ roundId, teamId, init }: { roundId: string; teamId: string; init?: KickerAdmin }) {
  const [made, setMade] = useState(init?.fgMade ?? "");
  const [missed, setMissed] = useState(init?.fgMissed ?? "");
  const [patMade, setPatMade] = useState(String(init?.patMade ?? 0));
  const [patFailed, setPatFailed] = useState(String(init?.patFailed ?? 0));
  const [longest, setLongest] = useState(init?.longest ?? false);
  const [winner, setWinner] = useState(init?.gameWinner ?? false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const yards = (t: string) =>
    t
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n));
  const pts = round2(
    kickerPoints({
      fgMade: yards(made),
      fgMissed: yards(missed),
      patMade: Number(patMade) || 0,
      patFailed: Number(patFailed) || 0,
      longest,
      gameWinner: winner,
    })
  );

  async function save() {
    setMsg(null);
    const r = await post({ action: "saveKicker", teamId, roundId, fgMade: made, fgMissed: missed, patMade, patFailed, longest, gameWinner: winner });
    setMsg(r.ok ? { text: "Saved.", ok: true } : { text: r.data.error ?? "Couldn't save.", ok: false });
  }

  return (
    <div className="border border-grid p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm">{teamName(teamId)} kicker</div>
        <div className="font-mono text-xs text-turf">{pts} pts</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lab}>made FG distances</label>
          <input className={input} value={made} onChange={(e) => setMade(e.target.value)} placeholder="42, 51" />
        </div>
        <div>
          <label className={lab}>missed FG distances</label>
          <input className={input} value={missed} onChange={(e) => setMissed(e.target.value)} placeholder="47" />
        </div>
        <div>
          <label className={lab}>extra points made</label>
          <input className={input} inputMode="numeric" value={patMade} onChange={(e) => setPatMade(e.target.value)} />
        </div>
        <div>
          <label className={lab}>extra points missed</label>
          <input className={input} inputMode="numeric" value={patFailed} onChange={(e) => setPatFailed(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={longest} onChange={(e) => setLongest(e.target.checked)} />
          longest FG of the round (+3)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={winner} onChange={(e) => setWinner(e.target.checked)} />
          game-winning FG (+2)
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} className={btn}>
          save
        </button>
        <Msg m={msg} />
      </div>
    </div>
  );
}

function KickersStep({ rounds, kickers }: { rounds: RoundAdmin[]; kickers: KickerAdmin[] }) {
  const active = rounds.filter((r) => r.teamIds.length > 0);
  if (active.length === 0) return <div className="text-sm text-black/40">Pick the teams for each round in step 2 first.</div>;
  return (
    <>
      {active.map((r) => (
        <div key={r.id} className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wide text-black/50">{r.label}</div>
          {r.teamIds.map((tid) => (
            <KickerRow
              key={r.id + tid + JSON.stringify(kickers.find((k) => k.teamId === tid && k.roundId === r.id) ?? null)}
              roundId={r.id}
              teamId={tid}
              init={kickers.find((k) => k.teamId === tid && k.roundId === r.id)}
            />
          ))}
        </div>
      ))}
    </>
  );
}

// ---- Whole section -----------------------------------------------------------
export default function SurvivorAdmin({
  teamIds,
  rounds,
  players,
  kickers,
}: {
  teamIds: string[];
  rounds: RoundAdmin[];
  players: PlayerAdmin[];
  kickers: KickerAdmin[];
}) {
  return (
    <div className="space-y-3">
      <Step n={1} title="Playoff teams" hint="Tick the teams that made the playoffs. Do this once." open>
        <TeamsStep key={teamIds.join(",")} teamIds={teamIds} />
      </Step>
      <Step n={2} title="Rounds" hint="For each round: when it locks and which teams are playing. Roster seats are built for you.">
        {rounds.map((r) => (
          <RoundCard key={r.id + r.lockTime + r.teamIds.join(",") + r.multiplier} round={r} allTeamIds={teamIds} />
        ))}
      </Step>
      <Step n={3} title="Players" hint="Paste in the players for every playoff team.">
        <AddPlayers hasPlayers={players.length > 0} />
      </Step>
      <Step n={4} title="Player scores" hint="Type in DraftKings fantasy points after games finish.">
        <ScoresStep key={players.map((p) => p.id + p.dkPoints).join("|")} players={players} />
      </Step>
      <Step n={5} title="Kicker stats" hint="Field goals and extra points for each team's kicker, per round.">
        <KickersStep rounds={rounds} kickers={kickers} />
      </Step>
    </div>
  );
}
