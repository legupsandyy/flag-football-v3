import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPlayoffTeams } from "@/lib/settings";

export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// One endpoint for every pick type. Locks are checked against the SERVER clock.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return bad("Not signed in", 401);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.kind !== "string") return bad("Bad request");
  const now = new Date();

  if (body.kind === "ats" || body.kind === "ou") {
    const game = await prisma.game.findUnique({ where: { id: String(body.gameId) } });
    if (!game) return bad("Game not found", 404);
    if (now >= game.kickoff) return bad("This game has kicked off — picks are locked.", 403);

    const allowed = body.kind === "ats" ? ["away", "home"] : ["over", "under"];
    if (!allowed.includes(body.side)) return bad("Invalid pick");

    const where = { userId_gameId: { userId: user.id, gameId: game.id } };
    if (body.kind === "ats") {
      await prisma.atsPick.upsert({
        where,
        update: { side: body.side },
        create: { userId: user.id, gameId: game.id, side: body.side },
      });
    } else {
      await prisma.ouPick.upsert({
        where,
        update: { side: body.side },
        create: { userId: user.id, gameId: game.id, side: body.side },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "salami") {
    const slate = await prisma.slate.findUnique({
      where: { id: String(body.slateId) },
      include: { games: { orderBy: { kickoff: "asc" }, take: 1 } },
    });
    if (!slate) return bad("Round not found", 404);
    if (slate.salamiLine === null) return bad("The Grand Salami line isn't set yet.", 403);
    const first = slate.games[0];
    if (!first) return bad("No games in this round yet.", 403);
    if (now >= first.kickoff) return bad("The first game has kicked off — Grand Salami is locked.", 403);
    if (!["over", "under"].includes(body.side)) return bad("Invalid pick");

    await prisma.salamiPick.upsert({
      where: { userId_slateId: { userId: user.id, slateId: slate.id } },
      update: { side: body.side },
      create: { userId: user.id, slateId: slate.id, side: body.side },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "superbowl") {
    // Locks when the very first Wild Card game kicks off.
    const first = await prisma.game.findFirst({ where: { slateId: "wc" }, orderBy: { kickoff: "asc" } });
    if (first && now >= first.kickoff) return bad("The Wild Card round has started — Super Bowl picks are locked.", 403);
    const teams = await getPlayoffTeams();
    if (!teams.includes(body.team)) return bad("Pick a team from the list.");

    await prisma.superBowlPick.upsert({
      where: { userId: user.id },
      update: { team: body.team },
      create: { userId: user.id, team: body.team },
    });
    return NextResponse.json({ ok: true });
  }

  return bad("Unknown pick type");
}
