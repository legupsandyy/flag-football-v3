"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GameForm, { AdminGame } from "./GameForm";
import DkSection, { DkSlateAdmin } from "./DkSection";
import { RULE_LABELS, DEFAULT_RULES, RuleKind } from "@/lib/rules";
import { PayoutConfig, PAYOUT_KEYS, PAYOUT_LABELS, money } from "@/lib/payouts";
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

function PayoutsEditor({ payouts, memberCount }: { payouts: PayoutConfig; memberCount: number }) {
  const router = useRouter();
  const [buyIns, setBuyIns] = useState<Record<string, string>>(() =>
    Object.fromEntries(PAYOUT_KEYS.map((k) => [k, String(payouts[k].buyIn)]))
  );
  const [prizes, setPrizes] = useState<Record<string, string>>(() =>
    Object.fromEntries(PAYOUT_KEYS.map((k) => [k, payouts[k].prizes.join(", ")]))
  );
  const [msg, setMsg] = useState<string | null>(null);

  const parse = (t: string) =>
    t
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map(Number);

  async function save() {
    const config: Record<string, { buyIn: number; prizes: number[] }> = {};
    for (const k of PAYOUT_KEYS) config[k] = { buyIn: Number(buyIns[k]), prizes: parse(prizes[k]) };
    const r = await call({ action: "savePayouts", config });
    setMsg(r.ok ? "Saved." : r.error ?? "Couldn't save.");
    if (r.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      {PAYOUT_KEYS.map((k) => {
        const pot = Number(buyIns[k] || 0) * memberCount;
        const paid = parse(prizes[k]).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
        const off = Math.abs(pot - paid) > 0.001;
        return (
          <div key={k} className="border border-grid bg-panel p-3 space-y-2">
            <div className="font-display text-sm">{PAYOUT_LABELS[k]}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-black/50">
                buy-in ($ each)
                <input className={input} inputMode="decimal" value={buyIns[k]} onChange={(e) => setBuyIns({ ...buyIns, [k]: e.target.value })} />
              </label>
              <label className="text-xs text-black/50">
                prizes ($, comma-separated, 1st first)
                <input className={input} value={prizes[k]} onChange={(e) => setPrizes({ ...prizes, [k]: e.target.value })} />
              </label>
            </div>
            <div className={`font-mono text-xs ${off ? "text-brick" : "text-black/40"}`}>
              pot with {memberCount} players: {money(pot)} · prizes add up to {money(paid)}
              {off && " — these don't match"}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <button onClick={save} className={btn}>
          save
        </button>
        {msg && <span className="font-mono text-xs text-turf">{msg}</span>}
      </div>
    </div>
  );
}

function RulesEditor({ kind, text }: { kind: RuleKind; text: string }) {
  const router = useRouter();
  const [value, setValue] = useState(text);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(next: string) {
    const r = await call({ action: "saveRules", kind, text: next });
    setMsg(r.ok ? "Saved." : r.error ?? "Couldn't save.");
    if (r.ok) router.refresh();
  }

  return (
    <div className="border border-grid bg-panel p-3 space-y-2">
      <div className="font-display text-sm">{RULE_LABELS[kind]}</div>
      <textarea className={input} rows={8} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex items-center gap-3">
        <button onClick={() => save(value)} className={btn}>
          save
        </button>
        <button
          onClick={() => {
            setValue(DEFAULT_RULES[kind]);
            save("");
          }}
          className="font-mono text-xs text-black/50 underline"
        >
          reset to original
        </button>
        {msg && <span className="font-mono text-xs text-turf">{msg}</span>}
      </div>
    </div>
  );
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
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  async function resetPin() {
    const r = await call({ action: "resetPin", id: member.id });
    setPinMsg(r.ok ? "PIN cleared" : r.error ?? "Couldn't reset");
  }

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
      <div className="flex items-center gap-2">
      {pinMsg && <span className="font-mono text-xs text-turf">{pinMsg}</span>}
      <button
        onClick={resetPin}
        className="border border-grid px-2 py-1 text-xs font-mono text-black/50 hover:border-turf hover:text-turf transition-colors"
      >
        reset PIN
      </button>
      <button
        onClick={remove}
        className="border border-grid px-2 py-1 text-xs font-mono text-black/50 hover:border-amber hover:text-amber transition-colors"
      >
        {confirm ? "tap again to remove" : "remove"}
      </button>
      </div>
    </div>
  );
}

export default function AdminPanel({
  payouts,
  memberCount,
  rules,
  slates,
  members,
  playoffTeams,
  superBowlWinner,
  dkSlates,
  survivor,
}: {
  payouts: PayoutConfig;
  memberCount: number;
  rules: Record<RuleKind, string>;
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
        <h2 className="font-display text-base mb-1">Buy-ins and payouts</h2>
        <p className="mb-2 text-xs text-black/50">
          Shown on the Payouts page. The pot is the buy-in times the number of people who&apos;ve joined, so the check line turns red if the
          prizes don&apos;t add up to it.
        </p>
        <PayoutsEditor payouts={payouts} memberCount={memberCount} />
      </section>

      <section>
        <h2 className="font-display text-base mb-1">Rules</h2>
        <p className="mb-2 text-xs text-black/50">
          One line = one bullet. Put **two stars** around words to make them bold. Save, and the contest page updates right away.
        </p>
        <div className="space-y-3">
          {(["ats", "ou", "survivor", "dk"] as RuleKind[]).map((k) => (
            <RulesEditor key={k} kind={k} text={rules[k]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-base mb-2">Playoff teams &amp; champion</h2>
        <SettingsBox playoffTeams={playoffTeams} superBowlWinner={superBowlWinner} />
      </section>

      {slates.map((s) => (
        <section key={s.id}>
          <h2 className="font-display text-base mb-2">{s.label}</h2>
          <div className="space-y-3">
            {s.id !== "sb" && <SalamiBox slate={s} />}
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
