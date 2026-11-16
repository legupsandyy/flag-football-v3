"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

interface Row {
  userId: string;
  name: string;
  perRound: Record<string, number>;
  total: number;
}

export default function Leaderboard() {
  const [rounds, setRounds] = useState<{ id: string; label: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/survivor/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setRounds(data.rounds);
        setRows(data.table);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-black/30 text-sm font-mono">loading…</p>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-amber" />
        <h2 className="font-display text-sm text-black/60 uppercase tracking-wide">Leaderboard</h2>
      </div>
      <div className="border border-grid overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-left text-black/40 text-[11px] uppercase row-line">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">name</th>
              {rounds.map((r) => (
                <th key={r.id} className="px-3 py-2 text-right">{r.label}</th>
              ))}
              <th className="px-4 py-2 text-right">total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.userId} className="row-line last:border-b-0">
                <td className="px-4 py-2 text-black/30 text-xs">{i + 1}</td>
                <td className="px-4 py-2 text-ink2">{row.name}</td>
                {rounds.map((r) => (
                  <td key={r.id} className="px-3 py-2 text-right text-black/50">
                    {row.perRound[r.id]?.toFixed(2) ?? "—"}
                  </td>
                ))}
                <td className="px-4 py-2 text-right text-turf font-semibold">{row.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
