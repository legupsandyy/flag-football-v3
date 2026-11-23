"use client";

import { useState } from "react";

// Team logos come from ESPN's public image address; if one can't load, nothing shows.
const ESPN_CODE: Record<string, string> = { was: "wsh" };

export default function TeamLogo({ teamId, size = 20 }: { teamId?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!teamId || failed) return null;
  const code = ESPN_CODE[teamId] ?? teamId;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
