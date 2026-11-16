import { prisma } from "./db";
import { aggregateMix, defaultPositionMix } from "./scoring";

// Makes a round's roster seats match how many teams are playing in it.
// Seats are rebuilt from the team count; seats that no longer exist lose their picks.
export async function syncRoundSlots(roundId: string) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) return;
  const teamIds: string[] = JSON.parse(round.teamIds);
  const mix = aggregateMix(defaultPositionMix(teamIds.length));

  const wanted = new Set<string>();
  for (const g of mix) for (let i = 0; i < g.count; i++) wanted.add(`${g.pos}:${i}`);
  wanted.add("KICK:0");

  const existing = await prisma.slot.findMany({ where: { roundId } });
  const have = new Set(existing.map((s) => `${s.position}:${s.index}`));
  const stale = existing.filter((s) => !wanted.has(`${s.position}:${s.index}`)).map((s) => s.id);

  const ops = [];
  if (stale.length) {
    ops.push(prisma.survivorPick.deleteMany({ where: { slotId: { in: stale } } }));
    ops.push(prisma.slot.deleteMany({ where: { id: { in: stale } } }));
  }
  for (const key of Array.from(wanted)) {
    if (have.has(key)) continue;
    const [position, index] = key.split(":");
    ops.push(prisma.slot.create({ data: { roundId, position, index: Number(index) } }));
  }
  ops.push(prisma.round.update({ where: { id: roundId }, data: { positionMix: JSON.stringify(mix) } }));
  await prisma.$transaction(ops);
}
