"use client";

import { useEffect, useState } from "react";

// Shows a kickoff time in the viewer's own time zone.
export default function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(
      new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    );
  }, [iso]);
  return <span>{text || "…"}</span>;
}
