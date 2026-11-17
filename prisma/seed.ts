import { PrismaClient } from "@prisma/client";
import { syncRoundSlots } from "../lib/survivorAdmin";

const prisma = new PrismaClient();

// This runs on every deploy, so it only ever ADDS missing basics and never
// overwrites anything you set on the admin page.
//
// Teams, players, round teams, lock times and scores are all set from /admin
// once the real playoff field is known.

const ROUNDS = [
  { id: "wc", label: "Wild Card", order: 1, multiplier: 1.0 },
  { id: "div", label: "Divisional", order: 2, multiplier: 1.33 },
  { id: "conf", label: "Conference", order: 3, multiplier: 2.33 },
  { id: "sb", label: "Super Bowl", order: 4, multiplier: 3.33 },
];

const SLATES = [
  { id: "wc", label: "Wild Card", order: 1 },
  { id: "div", label: "Divisional", order: 2 },
  { id: "conf", label: "Conference Championships", order: 3 },
  { id: "sb", label: "Super Bowl", order: 4 },
];

async function main() {
  for (const r of ROUNDS) {
    await prisma.round.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        label: r.label,
        order: r.order,
        multiplier: r.multiplier,
        lockTime: new Date("2027-01-09T21:00:00Z"), // placeholder — set the real one in /admin
        teamIds: "[]",
        positionMix: "[]",
      },
    });
    // Every round always has one KICK seat. The other seats are built in /admin
    // from the number of teams playing.
    await prisma.slot.upsert({
      where: { roundId_position_index: { roundId: r.id, position: "KICK", index: 0 } },
      update: {},
      create: { roundId: r.id, position: "KICK", index: 0 },
    });
  }

  // Keeps roster seats in step with the number of teams in each round. This also
  // repairs older data (for example, the Super Bowl now gets 2 Super Flex seats + 1 kicker).
  // Seats that already exist, and the picks in them, are left alone.
  const rounds = await prisma.round.findMany();
  for (const r of rounds) {
    await syncRoundSlots(r.id, prisma);
  }

  for (const s of SLATES) {
    await prisma.slate.upsert({
      where: { id: s.id },
      update: { label: s.label, order: s.order },
      create: s,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
