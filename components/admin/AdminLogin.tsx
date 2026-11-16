"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <div>
        <label className="block font-mono text-[11px] uppercase tracking-wide text-black/50 mb-1">admin password</label>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border border-grid bg-panel px-3 py-2 text-sm font-mono outline-none focus:border-turf"
          autoComplete="off"
          required
        />
      </div>
      {error && <div className="border border-turf/40 bg-turf/5 px-3 py-2 text-sm text-turf font-mono">{error}</div>}
      <button
        type="submit"
        className="w-full border border-turf text-turf px-4 py-2 text-sm font-mono hover:bg-turf hover:text-white transition-colors"
      >
        enter
      </button>
    </form>
  );
}
