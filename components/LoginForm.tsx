"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ users }: { users: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function signIn(userId: string) {
    setLoading(userId);
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.push("/survivor");
    router.refresh();
  }

  return (
    <div className="border border-grid">
      {users.map((u) => (
        <button
          key={u.id}
          onClick={() => signIn(u.id)}
          disabled={loading !== null}
          className="w-full text-left row-line px-4 py-2.5 text-sm font-mono hover:bg-black/[0.03] transition-colors disabled:opacity-50 last:border-b-0"
        >
          {loading === u.id ? "signing in…" : u.name}
        </button>
      ))}
    </div>
  );
}
