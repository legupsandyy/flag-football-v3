import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { slotId, playerId, kickTeamId } = await req.json();
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { round: true } });
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  // Server-side lock enforcement — never trust the client's clock.
  if (new Date() >= slot.round.lockTime) {
    return NextResponse.json({ error: "This round is locked" }, { status: 403 });
  }

  if (slot.position === "KICK") {
    if (!kickTeamId) return NextResponse.json({ error: "kickTeamId required" }, { status: 400 });
  } else {
    if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

    // Enforce: a player can't be used in more than one round, ever, by the same user.
    const alreadyUsed = await prisma.survivorPick.findFirst({
      where: { userId: user.id, playerId, slot: { roundId: { not: slot.roundId } } },
    });
    if (alreadyUsed) {
      return NextResponse.json({ error: "You've already used this player in an earlier round" }, { status: 409 });
    }

    // Enforce: one player per team within a round.
    const chosen = await prisma.player.findUnique({ where: { id: playerId } });
    if (!chosen) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    const sameTeam = await prisma.survivorPick.findFirst({
      where: {
        userId: user.id,
        slotId: { not: slotId },
        slot: { roundId: slot.roundId },
        player: { teamId: chosen.teamId },
      },
    });
    if (sameTeam) {
      return NextResponse.json({ error: "You already have a player from that team this round" }, { status: 409 });
    }

    // Enforce: no duplicate player within the same round's roster.
    const dupeInRound = await prisma.survivorPick.findFirst({
      where: { userId: user.id, playerId, slot: { roundId: slot.roundId }, slotId: { not: slotId } },
    });
    if (dupeInRound) {
      return NextResponse.json({ error: "That player is already on your roster this round" }, { status: 409 });
    }
  }

  const pick = await prisma.survivorPick.upsert({
    where: { userId_slotId: { userId: user.id, slotId } },
    update: { playerId: playerId ?? null, kickTeamId: kickTeamId ?? null },
    create: { userId: user.id, slotId, playerId: playerId ?? null, kickTeamId: kickTeamId ?? null },
  });

  return NextResponse.json({ ok: true, pick });
}
