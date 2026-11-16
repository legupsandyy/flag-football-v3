import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { getSetting, setSetting } from "@/lib/settings";
import { NFL_TEAMS } from "@/lib/nflTeams";
import { syncRoundSlots } from "@/lib/survivorAdmin";
import { parseYards, slugify } from "@/lib/scoring";

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

  try {
    return await handle(body);
  } catch (e) {
    // Show the real reason on screen instead of a blank failure.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin action failed:", body.action, msg);
    return bad("Server error: " + msg.split("\n").filter(Boolean).slice(-3).join(" ").slice(0, 300), 500);
  }
}

async function handle(body: any) {
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

    case "saveSurvivorTeams": {
      const ids: string[] = (Array.isArray(body.teamIds) ? body.teamIds : []).filter((id: string) =>
        NFL_TEAMS.some((t) => t.id === id)
      );
      const existing = await prisma.team.findMany({ select: { id: true } });
      const removed = existing.map((t) => t.id).filter((id) => !ids.includes(id));

      const ops = [];
      for (const id of ids) {
        const t = NFL_TEAMS.find((x) => x.id === id)!;
        ops.push(
          prisma.team.upsert({
            where: { id },
            update: { name: t.name, color: t.color },
            create: { id: t.id, name: t.name, color: t.color },
          })
        );
      }
      if (removed.length) {
        ops.push(
          prisma.survivorPick.deleteMany({
            where: { OR: [{ player: { teamId: { in: removed } } }, { kickTeamId: { in: removed } }] },
          })
        );
        ops.push(prisma.player.deleteMany({ where: { teamId: { in: removed } } }));
        ops.push(prisma.kickerStat.deleteMany({ where: { teamId: { in: removed } } }));
        ops.push(prisma.team.deleteMany({ where: { id: { in: removed } } }));
      }
      await prisma.$transaction(ops);

      // Drop removed teams from every round, then rebuild each round's seats.
      const rounds = await prisma.round.findMany();
      for (const r of rounds) {
        const cur: string[] = JSON.parse(r.teamIds);
        const kept = cur.filter((id) => ids.includes(id));
        if (kept.length !== cur.length) {
          await prisma.round.update({ where: { id: r.id }, data: { teamIds: JSON.stringify(kept) } });
        }
        await syncRoundSlots(r.id);
      }

      // Convenience: fill the pick'em Super Bowl list too, if it's still empty.
      if (!(await getSetting("playoffTeams")).trim() && ids.length) {
        await setSetting("playoffTeams", ids.map((id) => NFL_TEAMS.find((t) => t.id === id)!.name).join("\n"));
      }
      return NextResponse.json({ ok: true });
    }

    case "saveRound": {
      const round = await prisma.round.findUnique({ where: { id: String(body.id) } });
      if (!round) return bad("Round not found", 404);
      const lock = new Date(body.lockTime);
      if (isNaN(lock.getTime())) return bad("Enter a valid lock date and time.");
      const mult = num(body.multiplier);
      if (mult === null || mult <= 0) return bad("Enter the multiplier (like 1.33).");
      const teamIds: string[] = Array.isArray(body.teamIds) ? body.teamIds : [];
      const real = await prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true } });
      if (real.length !== teamIds.length) return bad("One of those teams isn't set up. Save the team list first.");

      await prisma.round.update({
        where: { id: round.id },
        data: { lockTime: lock, multiplier: mult, teamIds: JSON.stringify(teamIds) },
      });
      await syncRoundSlots(round.id);
      return NextResponse.json({ ok: true });
    }

    case "addPlayers": {
      const text: string = typeof body.text === "string" ? body.text : "";
      const teams = await prisma.team.findMany();
      const problems: string[] = [];
      const ops = [];
      let added = 0;
      for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (!line) continue;
        const parts = line.split(/[,\t]/).map((p: string) => p.trim());
        if (parts.length < 3) {
          problems.push(`"${line}" — use: Name, Position, Team`);
          continue;
        }
        const [name, posRaw, teamRaw] = parts;
        const pos = posRaw.toUpperCase();
        if (!["QB", "RB", "WR", "TE"].includes(pos)) {
          problems.push(`"${line}" — position must be QB, RB, WR or TE`);
          continue;
        }
        const key = teamRaw.toLowerCase();
        const team = teams.find((t) => t.id === key || t.name.toLowerCase() === key);
        if (!team) {
          problems.push(`"${line}" — team "${teamRaw}" isn't in your playoff team list`);
          continue;
        }
        if (!name) continue;
        const id = `${team.id}-${slugify(name)}`;
        ops.push(
          prisma.player.upsert({
            where: { id },
            update: { name, pos, teamId: team.id },
            create: { id, name, pos, teamId: team.id },
          })
        );
        added++;
      }
      if (ops.length) await prisma.$transaction(ops);
      return NextResponse.json({ ok: true, added, problems });
    }

    case "savePlayerPoints": {
      if (!Array.isArray(body.points)) return bad("Bad request");
      const ops = [];
      for (const row of body.points as { id: string; dk: unknown }[]) {
        const v = num(row.dk);
        ops.push(prisma.player.update({ where: { id: row.id }, data: { dkPoints: v === null ? 0 : v } }));
      }
      if (ops.length) await prisma.$transaction(ops);
      return NextResponse.json({ ok: true });
    }

    case "deletePlayer": {
      if (!body.id) return bad("Missing player");
      await prisma.$transaction([
        prisma.survivorPick.deleteMany({ where: { playerId: body.id } }),
        prisma.player.delete({ where: { id: body.id } }),
      ]);
      return NextResponse.json({ ok: true });
    }

    case "clearSurvivorSample": {
      await prisma.$transaction([
        prisma.survivorPick.deleteMany({}),
        prisma.player.deleteMany({}),
        prisma.kickerStat.deleteMany({}),
      ]);
      return NextResponse.json({ ok: true });
    }

    case "saveKicker": {
      const teamId = String(body.teamId);
      const roundId = String(body.roundId);
      const made = parseYards(body.fgMade);
      const missed = parseYards(body.fgMissed);
      if (made === null || missed === null) return bad("Field goal distances must be numbers like 42, 51.");
      const patMade = Math.max(0, Math.round(num(body.patMade) ?? 0));
      const patFailed = Math.max(0, Math.round(num(body.patFailed) ?? 0));
      const data = {
        fgMade: JSON.stringify(made),
        fgMissed: JSON.stringify(missed),
        patMade,
        patFailed,
        longest: !!body.longest,
        gameWinner: !!body.gameWinner,
      };
      await prisma.kickerStat.upsert({
        where: { teamId_roundId: { teamId, roundId } },
        update: data,
        create: { teamId, roundId, ...data },
      });
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
