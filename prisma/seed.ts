import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAMS = [
  { id: "buf", name: "Bills", color: "#00338D" },
  { id: "bal", name: "Ravens", color: "#241773" },
  { id: "det", name: "Lions", color: "#0076B6" },
  { id: "gb", name: "Packers", color: "#203731" },
  { id: "kc", name: "Chiefs", color: "#E31837" },
  { id: "hou", name: "Texans", color: "#03202F" },
  { id: "phi", name: "Eagles", color: "#004C54" },
  { id: "tb", name: "Buccaneers", color: "#D50A0A" },
  { id: "min", name: "Vikings", color: "#4F2683" },
  { id: "pit", name: "Steelers", color: "#FFB612" },
  { id: "lac", name: "Chargers", color: "#0080C6" },
  { id: "was", name: "Commanders", color: "#5A1414" },
];

// NOTE: replace dkPoints with 0 once the real stats-feed sync job is wired up —
// these are placeholder values just so the app has something to render.
const PLAYERS = [
  { name: "Josh Allen", pos: "QB", team: "buf", dk: 31.2 },
  { name: "James Cook", pos: "RB", team: "buf", dk: 18.4 },
  { name: "Khalil Shakir", pos: "WR", team: "buf", dk: 14.1 },
  { name: "Lamar Jackson", pos: "QB", team: "bal", dk: 28.6 },
  { name: "Derrick Henry", pos: "RB", team: "bal", dk: 22.9 },
  { name: "Zay Flowers", pos: "WR", team: "bal", dk: 16.3 },
  { name: "Jared Goff", pos: "QB", team: "det", dk: 24.0 },
  { name: "Jahmyr Gibbs", pos: "RB", team: "det", dk: 20.7 },
  { name: "Amon-Ra St. Brown", pos: "WR", team: "det", dk: 19.5 },
  { name: "Sam LaPorta", pos: "TE", team: "det", dk: 12.2 },
  { name: "Jordan Love", pos: "QB", team: "gb", dk: 21.4 },
  { name: "Josh Jacobs", pos: "RB", team: "gb", dk: 17.8 },
  { name: "Patrick Mahomes", pos: "QB", team: "kc", dk: 26.3 },
  { name: "Isiah Pacheco", pos: "RB", team: "kc", dk: 15.9 },
  { name: "Travis Kelce", pos: "TE", team: "kc", dk: 17.6 },
  { name: "C.J. Stroud", pos: "QB", team: "hou", dk: 20.1 },
  { name: "Nico Collins", pos: "WR", team: "hou", dk: 18.8 },
  { name: "Jalen Hurts", pos: "QB", team: "phi", dk: 27.5 },
  { name: "Saquon Barkley", pos: "RB", team: "phi", dk: 24.2 },
  { name: "A.J. Brown", pos: "WR", team: "phi", dk: 20.9 },
  { name: "Baker Mayfield", pos: "QB", team: "tb", dk: 19.3 },
  { name: "Mike Evans", pos: "WR", team: "tb", dk: 16.7 },
  { name: "Sam Darnold", pos: "QB", team: "min", dk: 18.2 },
  { name: "Justin Jefferson", pos: "WR", team: "min", dk: 21.6 },
  { name: "Russell Wilson", pos: "QB", team: "pit", dk: 15.4 },
  { name: "Najee Harris", pos: "RB", team: "pit", dk: 13.9 },
  { name: "Justin Herbert", pos: "QB", team: "lac", dk: 22.8 },
  { name: "J.K. Dobbins", pos: "RB", team: "lac", dk: 16.5 },
  { name: "Jayden Daniels", pos: "QB", team: "was", dk: 25.7 },
  { name: "Terry McLaurin", pos: "WR", team: "was", dk: 17.1 },
];

const ROUNDS = [
  {
    id: "wc",
    label: "Wild Card",
    order: 1,
    multiplier: 1.0,
    teamIds: ["buf", "bal", "det", "gb", "kc", "hou", "phi", "tb", "min", "pit", "lac", "was"],
    positionMix: [
      { pos: "QB", count: 2 },
      { pos: "RB", count: 3 },
      { pos: "WR", count: 4 },
      { pos: "TE", count: 1 },
      { pos: "FLEX", count: 2 },
    ],
  },
  {
    id: "div",
    label: "Divisional",
    order: 2,
    multiplier: 1.33,
    teamIds: ["buf", "det", "kc", "phi", "min", "pit", "lac", "was"],
    positionMix: [
      { pos: "QB", count: 1 },
      { pos: "RB", count: 2 },
      { pos: "WR", count: 3 },
      { pos: "TE", count: 1 },
      { pos: "FLEX", count: 1 },
    ],
  },
  {
    id: "conf",
    label: "Conference",
    order: 3,
    multiplier: 2.33,
    teamIds: ["buf", "kc", "phi", "was"],
    positionMix: [
      { pos: "QB", count: 1 },
      { pos: "RB", count: 1 },
      { pos: "WR", count: 1 },
      { pos: "TE", count: 1 },
    ],
  },
  {
    id: "sb",
    label: "Super Bowl",
    order: 4,
    multiplier: 3.33,
    teamIds: ["kc", "phi"],
    positionMix: [
      { pos: "SUPER FLEX", count: 1 },
      { pos: "SUPER FLEX", count: 1 },
    ],
  },
];

const KICKER_STATS: Record<
  string,
  { fgMade: number[]; fgMissed: number[]; patMade: number; patFailed: number; longest: boolean; gameWinner: boolean }
> = {
  buf: { fgMade: [42, 51], fgMissed: [], patMade: 3, patFailed: 0, longest: true, gameWinner: false },
  bal: { fgMade: [38], fgMissed: [47], patMade: 2, patFailed: 0, longest: false, gameWinner: false },
  det: { fgMade: [29, 33, 44], fgMissed: [], patMade: 1, patFailed: 0, longest: false, gameWinner: true },
  gb: { fgMade: [], fgMissed: [52], patMade: 4, patFailed: 1, longest: false, gameWinner: false },
  kc: { fgMade: [55], fgMissed: [], patMade: 2, patFailed: 0, longest: true, gameWinner: false },
  hou: { fgMade: [31], fgMissed: [], patMade: 3, patFailed: 0, longest: false, gameWinner: false },
  phi: { fgMade: [41, 22], fgMissed: [], patMade: 2, patFailed: 0, longest: false, gameWinner: false },
  tb: { fgMade: [37], fgMissed: [45], patMade: 1, patFailed: 0, longest: false, gameWinner: false },
  min: { fgMade: [], fgMissed: [], patMade: 5, patFailed: 0, longest: false, gameWinner: false },
  pit: { fgMade: [48], fgMissed: [], patMade: 2, patFailed: 0, longest: false, gameWinner: false },
  lac: { fgMade: [26, 34], fgMissed: [], patMade: 2, patFailed: 0, longest: false, gameWinner: false },
  was: { fgMade: [50], fgMissed: [], patMade: 3, patFailed: 0, longest: false, gameWinner: true },
};

// Placeholder participant list — replace with your real 18 names, or let
// people self-register once real auth is wired up.
const USERS = [
  "c morriss", "viggs", "paul", "j price", "bendover", "ian", "c spencer",
  "dan", "umphries", "bozz", "rawbunz", "david", "terzo", "laxner",
  "sandman", "austin", "amp",
];

async function main() {
  for (const t of TEAMS) {
    await prisma.team.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  for (const p of PLAYERS) {
    const id = `${p.team}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    await prisma.player.upsert({
      where: { id },
      update: {},
      create: { id, name: p.name, pos: p.pos, teamId: p.team, dkPoints: p.dk },
    });
  }

  for (const r of ROUNDS) {
    await prisma.round.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        label: r.label,
        order: r.order,
        multiplier: r.multiplier,
        lockTime: new Date("2027-01-09T21:00:00Z"), // placeholder — set real kickoff per round
        teamIds: JSON.stringify(r.teamIds),
        positionMix: JSON.stringify(r.positionMix),
      },
    });

    let index = 0;
    for (const group of r.positionMix) {
      for (let i = 0; i < group.count; i++) {
        await prisma.slot.upsert({
          where: { roundId_position_index: { roundId: r.id, position: group.pos, index: i } },
          update: {},
          create: { roundId: r.id, position: group.pos, index: i },
        });
        index++;
      }
    }
    // Every round also gets exactly one KICK slot.
    await prisma.slot.upsert({
      where: { roundId_position_index: { roundId: r.id, position: "KICK", index: 0 } },
      update: {},
      create: { roundId: r.id, position: "KICK", index: 0 },
    });

    for (const teamId of r.teamIds) {
      const stat = KICKER_STATS[teamId];
      if (!stat) continue;
      await prisma.kickerStat.upsert({
        where: { teamId_roundId: { teamId, roundId: r.id } },
        update: {},
        create: {
          teamId,
          roundId: r.id,
          fgMade: JSON.stringify(stat.fgMade),
          fgMissed: JSON.stringify(stat.fgMissed),
          patMade: stat.patMade,
          patFailed: stat.patFailed,
          longest: stat.longest,
          gameWinner: stat.gameWinner,
        },
      });
    }
  }

  for (const name of USERS) {
    await prisma.user.upsert({ where: { name }, update: {}, create: { name } });
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
