"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type DkSlateAdmin = { id: string; label: string; scores: Record<string, number> };
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

function SlateCard({ slate, members }: { slate: DkSlateAdmin; members: Member[] }) {
  const router = useRouter();
  const [label, setLabel] = useState(slate.label);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const mem of members) m[mem.id] = slate.scores[mem.id] !== undefined ? String(slate.scores[mem.id]) : "";
    return m;
  });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function save() {
    setMsg(null);
    const a = await call({ action: "saveDkSlate", id: slate.id, label });
    if (!a.ok) return setMsg({ text: a.error ?? "Couldn't save.", ok: false });
    const b = await call({
      action: "saveDkScores",
      slateId: slate.id,
      scores: members.map((m) => ({ userId: m.id, points: vals[m.id] ?? "" })),
    });
    if (!b.ok) return setMsg({ text: b.error ?? "Couldn't save.", ok: false });
    setMsg({ text: "Saved.", ok: true });
    router.refresh();
  }

  async function remove() {
    if (!confirm) return setConfirm(true);
    const r = await call({ action: "deleteDkSlate", id: slate.id });
    if (r.ok) router.refresh();
    else setMsg({ text: r.error ?? "Couldn't delete.", ok: false });
  }

  return (
    <div className="border border-grid bg-panel p-3 space-y-3">
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-black/50 mb-0.5">slate name</label>
        <input className={input} value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="border border-grid">
        {members.length === 0 && <div className="px-3 py-2 text-sm text-black/40">No members yet.</div>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between row-line last:border-b-0 px-3 py-1.5">
            <span className="text-sm">{m.name}</span>
            <input
              className="w-24 border border-grid bg-panel px-2 py-1 text-sm font-mono text-right outline-none focus:border-turf"
              inputMode="decimal"
              placeholder="—"
              value={vals[m.id] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [m.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} className={btn}>
          save scores
        </button>
        <button
          onClick={remove}
          className="border border-grid px-3 py-1.5 text-sm font-mono text-black/50 hover:border-amber hover:text-amber transition-colors"
        >
          {confirm ? "tap again to delete" : "delete slate"}
        </button>
        {msg && <span className={`font-mono text-xs ${msg.ok ? "text-turf" : "text-amber"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

export default function DkSection({ slates, members }: { slates: DkSlateAdmin[]; members: Member[] }) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await call({ action: "saveDkSlate", label: newLabel });
    if (!r.ok) return setMsg(r.error ?? "Couldn't add.");
    setNewLabel("");
    setMsg(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {slates.map((s) => (
        // Re-mount when saved scores change so the boxes always match the database.
        <SlateCard key={s.id + JSON.stringify(s.scores) + s.label} slate={s} members={members} />
      ))}
      <form onSubmit={add} className="border border-grid bg-panel p-3 flex items-end gap-2">
        <div className="flex-1">
          <label className="block font-mono text-[10px] uppercase tracking-wide text-black/50 mb-0.5">
            add a slate
          </label>
          <input
            className={input}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Wild Card Saturday"
          />
        </div>
        <button type="submit" className={btn}>
          add
        </button>
      </form>
      {msg && <div className="font-mono text-xs text-amber">{msg}</div>}
    </div>
  );
}
