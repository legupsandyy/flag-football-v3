import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { setSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// One endpoint for every admin action. Each request says what it wants in `action`.
export async function POST(req: NextRequest) {
  if (!isAdmin()) return bad("Not signed in as admin", 401);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return bad("Bad request");

  switch (body.action) {
    case "saveGame": {
      const { id, slateId, awayTeam, homeTeam, kickoff, favorite } = body;
      const spread = num(body.spread);
      const total = num(body.total);
      if (!slateId || !awayTeam?.trim() || !homeTeam?.trim()) return bad("Pick a round and enter both teams.");
      const kick = new Date(kickoff);
      if (isNaN(kick.getTime())) return bad("Enter a valid kickoff date and time.");
      if (spread === null || spread < 0) return bad("Enter the spread as a positive number (use 0 for pick'em).");
      if (total === null || total <= 0) return bad("Enter the over/under total.");

      // Admin enters "favorite + spread"; we store the home team's spread.
      const homeSpread = spread === 0 ? 0 : favorite === "home" ? -spread : spread;

      const awayScore = num(body.awayScore);
      const homeScore = num(body.homeScore);
      const isFinal = !!body.isFinal;
      if (isFinal && (awayScore === null || homeScore === null)) {
        return bad("Enter both scores before marking the game final.");
      }

      const data = {
        slateId,
        awayTeam: awayTeam.trim(),
        homeTeam: homeTeam.trim(),
        kickoff: kick,
        homeSpread,
        total,
        awayScore: awayScore === null ? null : Math.round(awayScore),
        homeScore: homeScore === null ? null : Math.round(homeScore),
        isFinal,
      };
      if (id) {
        await prisma.game.update({ where: { id }, data });
      } else {
        await prisma.game.create({ data });
      }
      return NextResponse.json({ ok: true });
    }

    case "deleteGame": {
      if (!body.id) return bad("Missing game");
      await prisma.game.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    case "saveSlate": {
      if (!body.id) return bad("Missing round");
      const line = num(body.salamiLine);
      await prisma.slate.update({ where: { id: body.id }, data: { salamiLine: line } });
      return NextResponse.json({ ok: true });
    }

    case "saveSettings": {
      if (typeof body.playoffTeams === "string") await setSetting("playoffTeams", body.playoffTeams);
      if (typeof body.superBowlWinner === "string") await setSetting("superBowlWinner", body.superBowlWinner.trim());
      return NextResponse.json({ ok: true });
    }

    case "saveDkSlate": {
      const label = typeof body.label === "string" ? body.label.trim() : "";
      if (!label) return bad("Enter a name for the slate.");
      if (body.id) await prisma.dkSlate.update({ where: { id: body.id }, data: { label } });
      else await prisma.dkSlate.create({ data: { label } });
      return NextResponse.json({ ok: true });
    }

    case "deleteDkSlate": {
      if (!body.id) return bad("Missing slate");
      await prisma.dkSlate.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    case "saveDkScores": {
      if (!body.slateId || !Array.isArray(body.scores)) return bad("Bad request");
      const ops = [];
      for (const row of body.scores as { userId: string; points: unknown }[]) {
        const pts = num(row.points);
        const where = { slateId_userId: { slateId: body.slateId, userId: row.userId } };
        if (pts === null) {
          // Blank box = no score for this person.
          ops.push(prisma.dkScore.deleteMany({ where: { slateId: body.slateId, userId: row.userId } }));
        } else {
          ops.push(
            prisma.dkScore.upsert({
              where,
              update: { points: pts },
              create: { slateId: body.slateId, userId: row.userId, points: pts },
            })
          );
        }
      }
      await prisma.$transaction(ops);
      return NextResponse.json({ ok: true });
    }

    case "deleteUser": {
      if (!body.id) return bad("Missing member");
      // Survivor picks don't auto-delete with the user, so clear them first.
      await prisma.$transaction([
        prisma.survivorPick.deleteMany({ where: { userId: body.id } }),
        prisma.user.delete({ where: { id: body.id } }),
      ]);
      return NextResponse.json({ ok: true });
    }

    default:
      return bad("Unknown action");
  }
}
