"use client";

import { useState } from "react";
import { findTeam } from "@/lib/teamMatch";
import type { PropsData } from "@/lib/propsData";
import { Option, TeamName, Others } from "./PickBoard";

export default function PropsBoard({ data }: { data: PropsData }) {
  const [picks, setPicks] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(data.questions.map((q) => [q.id, q.myPick]))
  );
  const [total, setTotal] = useState(data.myTotal === null ? "" : String(data.myTotal));
  const [savedTotal, setSavedTotal] = useState(data.myTotal);
  const [error, setError] = useState<string | null>(null);

  async function save(qid: string, answer: string, revert: () => void) {
    setError(null);
    const res = await fetch("/api/props", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qid, answer }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      revert();
      setError(d.error ?? "Couldn't save that pick. Try again.");
    }
  }

  function pick(qid: string, value: string) {
    const before = picks[qid] ?? null;
    setPicks((p) => ({ ...p, [qid]: value }));
    save(qid, value, () => setPicks((p) => ({ ...p, [qid]: before })));
  }

  async function saveTotal() {
    const n = Number(total);
    if (total.trim() === "" || !Number.isFinite(n)) return setError("Enter the total points as a number.");
    const before = savedTotal;
    setSavedTotal(Math.round(n));
    await save("total", String(n), () => setSavedTotal(before));
  }

  const answered = data.questions.filter((q) => picks[q.id]).length + (savedTotal !== null ? 1 : 0);

  return (
    <div>
      {error && (
        <div className="sticky top-16 z-30 mb-3 border border-brick/40 bg-brick/10 px-3 py-2 font-mono text-sm text-brick">{error}</div>
      )}
      <div className="mb-3 flex items-baseline justify-between border-b border-grid pb-2">
        <h2 className="font-display text-lg">
          {data.away} vs {data.home}
        </h2>
        <span className="font-mono text-xs text-black/40">{answered}/11 answered</span>
      </div>

      <div className="space-y-4">
        {data.questions.map((q, i) => {
          const mine = picks[q.id] ?? null;
          const correctLabel = q.answer ? q.options.find((o) => o.value === q.answer)?.label : null;
          return (
            <div key={q.id} className="border border-grid bg-panel p-4">
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="text-[15px] font-medium">
                  <span className="mr-2 font-mono text-xs text-black/40">{i + 1}</span>
                  {q.text}
                </div>
                {mine && q.answer && (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${
                      mine === q.answer ? "bg-turf text-white" : "bg-brick/10 text-brick"
                    }`}
                  >
                    {mine === q.answer ? "right" : "wrong"}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {q.options.map((o) => {
                  const isTeam = o.value === "away" || o.value === "home";
                  return (
                    <Option
                      key={o.value}
                      selected={mine === o.value}
                      locked={data.locked}
                      result={q.answer && mine === o.value ? (q.answer === o.value ? "win" : "loss") : null}
                      onClick={() => pick(q.id, o.value)}
                      stripe={isTeam ? findTeam(o.label)?.color : undefined}
                    >
                      {isTeam ? (
                        <TeamName className="pr-5 text-[15px] font-semibold" name={o.label} />
                      ) : (
                        <div className="text-[15px] font-semibold">{o.label}</div>
                      )}
                    </Option>
                  );
                })}
              </div>
              {correctLabel && <div className="mt-2 font-mono text-xs text-black/50">Answer: {correctLabel}</div>}
              {data.locked && !mine && <div className="mt-2 font-mono text-xs text-black/40">no pick made</div>}
              <Others groups={q.others} />
            </div>
          );
        })}

        <div className="border border-grid bg-panel p-4">
          <div className="mb-1 text-[15px] font-medium">
            <span className="mr-2 font-mono text-xs text-black/40">tiebreaker</span>
            Total points scored by both teams
          </div>
          <p className="mb-3 text-xs text-black/50">Closest guess wins a tie. This one isn&apos;t worth a point.</p>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={total}
              disabled={data.locked}
              onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              className="w-28 border border-grid bg-panel px-3 py-2 font-mono text-base outline-none focus:border-turf disabled:opacity-60"
              placeholder="e.g. 47"
            />
            {!data.locked && (
              <button
                onClick={saveTotal}
                className="border border-turf px-3 py-2 font-mono text-sm text-turf transition-colors hover:bg-turf hover:text-white"
              >
                save
              </button>
            )}
            {savedTotal !== null && <span className="font-mono text-xs text-turf">saved: {savedTotal}</span>}
          </div>
          {data.finalTotal !== null && <div className="mt-2 font-mono text-xs text-black/50">Final total: {data.finalTotal}</div>}
        </div>
      </div>
    </div>
  );
}
