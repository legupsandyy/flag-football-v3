"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminGame = {
  id: string;
  awayTeam: string;
  homeTeam: string;
  kickoff: string; // ISO
  homeSpread: number;
  total: number;
  awayScore: number | null;
  homeScore: number | null;
  isFinal: boolean;
};

// Turns an ISO time into the "2027-01-09T15:30" text a datetime box wants, in the admin's own time zone.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const input = "w-full border border-grid bg-panel px-2 py-1.5 text-sm font-mono outline-none focus:border-turf";
const label = "block font-mono text-[10px] uppercase tracking-wide text-black/50 mb-0.5";

export default function GameForm({ slateId, game }: { slateId: string; game?: AdminGame }) {
  const router = useRouter();
  const [away, setAway] = useState(game?.awayTeam ?? "");
  const [home, setHome] = useState(game?.homeTeam ?? "");
  const [kickoff, setKickoff] = useState(game ? toLocalInput(game.kickoff) : "");
  const [favorite, setFavorite] = useState<"home" | "away">(game && game.homeSpread > 0 ? "away" : "home");
  const [spread, setSpread] = useState(game ? String(Math.abs(game.homeSpread)) : "");
  const [total, setTotal] = useState(game ? String(game.total) : "");
  const [awayScore, setAwayScore] = useState(game?.awayScore != null ? String(game.awayScore) : "");
  const [homeScore, setHomeScore] = useState(game?.homeScore != null ? String(game.homeScore) : "");
  const [isFinal, setIsFinal] = useState(game?.isFinal ?? false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error as string | undefined };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const kick = new Date(kickoff);
    if (isNaN(kick.getTime())) {
      setMsg({ text: "Enter the kickoff date and time.", ok: false });
      setBusy(false);
      return;
    }
    const r = await call({
      action: "saveGame",
      id: game?.id,
      slateId,
      awayTeam: away,
      homeTeam: home,
      kickoff: kick.toISOString(),
      favorite,
      spread,
      total,
      awayScore,
      homeScore,
      isFinal,
    });
    setBusy(false);
    if (!r.ok) {
      setMsg({ text: r.error ?? "Couldn't save.", ok: false });
      return;
    }
    setMsg({ text: "Saved.", ok: true });
    if (!game) {
      setAway("");
      setHome("");
      setKickoff("");
      setSpread("");
      setTotal("");
    }
    router.refresh();
  }

  async function remove() {
    if (!game) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const r = await call({ action: "deleteGame", id: game.id });
    if (!r.ok) setMsg({ text: r.error ?? "Couldn't delete.", ok: false });
    else router.refresh();
  }

  return (
    <form onSubmit={save} className="border border-grid bg-panel p-3 space-y-3">
      {!game && <div className="font-display text-sm">Add a game</div>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>away team</label>
          <input className={input} value={away} onChange={(e) => setAway(e.target.value)} placeholder="Bills" required />
        </div>
        <div>
          <label className={label}>home team</label>
          <input className={input} value={home} onChange={(e) => setHome(e.target.value)} placeholder="Chiefs" required />
        </div>
      </div>
      <div>
        <label className={label}>kickoff (your time zone)</label>
        <input type="datetime-local" className={input} value={kickoff} onChange={(e) => setKickoff(e.target.value)} required />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={label}>favorite</label>
          <select className={input} value={favorite} onChange={(e) => setFavorite(e.target.value as "home" | "away")}>
            <option value="home">home team</option>
            <option value="away">away team</option>
          </select>
        </div>
        <div>
          <label className={label}>spread</label>
          <input className={input} inputMode="decimal" value={spread} onChange={(e) => setSpread(e.target.value)} placeholder="3.5" required />
        </div>
        <div>
          <label className={label}>total (o/u)</label>
          <input className={input} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="47.5" required />
        </div>
      </div>

      {game && (
        <div className="border-t border-grid pt-3 grid grid-cols-3 gap-2 items-end">
          <div>
            <label className={label}>away score</label>
            <input className={input} inputMode="numeric" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
          </div>
          <div>
            <label className={label}>home score</label>
            <input className={input} inputMode="numeric" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm pb-1.5">
            <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
            final
          </label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="border border-turf text-turf px-3 py-1.5 text-sm font-mono hover:bg-turf hover:text-white transition-colors disabled:opacity-50"
        >
          {game ? "save" : "add game"}
        </button>
        {game && (
          <button
            type="button"
            onClick={remove}
            className="border border-grid px-3 py-1.5 text-sm font-mono text-black/50 hover:border-amber hover:text-amber transition-colors"
          >
            {confirmDelete ? "tap again to delete" : "delete"}
          </button>
        )}
        {msg && <span className={`font-mono text-xs ${msg.ok ? "text-turf" : "text-amber"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
