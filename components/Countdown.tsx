"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${min}m`;
  return `${min}m`;
}

export default function Countdown({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => setText(format(new Date(iso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [iso]);
  return <span>{text || "…"}</span>;
}
