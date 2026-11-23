import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PROP_QUESTIONS, validAnswer } from "@/lib/props";

export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// Save one prop answer (or the total-points tiebreaker guess). Locks at the Super Bowl kickoff.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return bad("Not signed in", 401);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.qid !== "string") return bad("Bad request");

  const game = await prisma.game.findFirst({ where: { slateId: "sb" }, orderBy: { kickoff: "asc" } });
  if (!game) return bad("The Super Bowl matchup isn't set yet.", 403);
  if (new Date() >= game.kickoff) return bad("The Super Bowl has kicked off — props are locked.", 403);

  let answer = String(body.answer ?? "").trim();
  if (body.qid === "total") {
    const n = Number(answer);
    if (!Number.isFinite(n) || n < 0 || n > 200) return bad("Enter the total points as a number.");
    answer = String(Math.round(n));
  } else {
    const q = PROP_QUESTIONS.find((x) => x.id === body.qid);
    if (!q || !validAnswer(q, answer)) return bad("Invalid pick");
  }

  await prisma.propPick.upsert({
    where: { userId_qid: { userId: user.id, qid: body.qid } },
    update: { answer },
    create: { userId: user.id, qid: body.qid, answer },
  });
  return NextResponse.json({ ok: true });
}
