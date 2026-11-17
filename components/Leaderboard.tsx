"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import RankBadge from "./RankBadge";

interface Row {
  userId: string;
  name: string;
  perRound: Record<string, number>;
  total: number;
}

export default function Leaderboard() {
  const [rounds, setRounds] = useState<{ id: string; label: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/survivor/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setRounds(data.rounds ?? []);
        setRows(data.table ?? []);
        setMeId(data.meId ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="font-mono text-sm text-black/30">loading…</p>;

  // Tied totals share a rank.
  let lastTotal: number | null = null;
  let lastRank = 0;
  const ranked = rows.map((r, i) => {
    if (r.total !== lastTotal) {
      lastRank = i + 1;
      lastTotal = r.total;
    }
    return { ...r, rank: lastRank };
  });

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={15} className="text-amber" />
        <h2 className="font-display text-lg">Leaderboard</h2>
      </div>
      {rows.length === 0 ? (
        <div className="border border-grid bg-panel px-4 py-6 text-center text-sm text-black/40">No one has joined yet.</div>
      ) : (
        <div className="overflow-x-auto border border-grid bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="row-line text-left font-mono text-[10px] uppercase tracking-wide text-black/40">
                <th className="sticky left-0 bg-panel px-3 py-2 font-normal">player</th>
                {rounds.map((r) => (
                  <th key={r.id} className="whitespace-nowrap px-3 py-2 text-right font-normal">
                    {r.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-normal">total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row) => {
                const me = row.userId === meId;
                return (
                  <tr key={row.userId} className={`row-line last:border-b-0 ${me ? "bg-turf/5" : ""}`}>
                    <td className={`sticky left-0 px-3 py-2.5 ${me ? "bg-[#eef5f3]" : "bg-panel"}`}>
                      <div className="flex items-center gap-2.5">
                        <RankBadge rank={row.rank} />
                        <span className={`max-w-[120px] truncate ${me ? "font-semibold" : ""}`}>{row.name}</span>
                      </div>
                    </td>
                    {rounds.map((r) => (
                      <td key={r.id} className="px-3 py-2.5 text-right font-mono text-xs text-black/50">
                        {row.perRound[r.id] ? row.perRound[r.id].toFixed(2) : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-turf">{row.total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
