"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Try again.");
      setLoading(false);
      return;
    }
    router.push("/survivor");
    router.refresh();
  }

  const input =
    "min-h-[44px] w-full border border-grid bg-panel px-3 py-2 text-base font-mono outline-none focus:border-turf";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block font-mono text-[11px] uppercase tracking-wide text-black/50 mb-1">
          group password
        </label>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={input}
          autoComplete="off"
          required
        />
      </div>
      <div>
        <label className="block font-mono text-[11px] uppercase tracking-wide text-black/50 mb-1">
          your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
          maxLength={30}
          autoComplete="off"
          required
        />
      </div>
      {error && (
        <div className="border border-turf/40 bg-turf/5 px-3 py-2 text-sm text-turf font-mono">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="min-h-[44px] w-full border border-turf bg-turf px-4 py-2 text-sm font-mono text-white transition-colors hover:bg-turf/90 disabled:opacity-50"
      >
        {loading ? "joining…" : "join / sign in"}
      </button>
    </form>
  );
}
