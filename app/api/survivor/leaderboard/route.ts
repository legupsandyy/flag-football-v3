import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadSurvivorScores } from "@/lib/survivorScores";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { rounds, table } = await loadSurvivorScores();
  const rows = table.map(({ userId, name, perRound, total }) => ({ userId, name, perRound, total }));
  rows.sort((a, b) => b.total - a.total);

  return NextResponse.json({ rounds: rounds.map((r) => ({ id: r.id, label: r.label })), table: rows, meId: me.id });
}
