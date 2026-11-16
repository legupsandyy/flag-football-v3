# Postseason Tournament App

Survivor draft pool is fully wired up (real DB, real API routes, lock enforcement,
no-reuse enforcement, live leaderboard). ATS, O/U, and DK Slates are stub pages —
same pattern, not yet built.

## Run it locally

```bash
npm install
npx prisma generate
npx prisma db push      # creates dev.db (SQLite) from the schema
npm run seed             # loads teams, players, rounds, kicker stats, participant list
npm run dev
```

Then open http://localhost:3000, sign in as any seeded name (e.g. "viggs"), and go to Survivor.

> A `.env` file with `DATABASE_URL="file:./dev.db"` is already included for local dev.

## What's real vs. placeholder right now

- **Real:** data model, lock-time enforcement (server-side, not just hidden UI), the
  no-reuse-across-rounds rule, the kicker scoring formula, round multipliers, leaderboard math.
- **Placeholder:** `dkPoints` on each player is a made-up number in the seed data — swap this
  for actual output from a stats API (see the main technical plan, §5) once you pick one.
  `lockTime` on each round is also a placeholder date — set real kickoff times before this goes live.
- **Not built:** ATS pick'em, O/U pick'em, DK Slates entry — same architecture pattern as
  Survivor (Round/Slot-style tables, a state API route, a pick API route). Happy to build these
  next in the same style once Survivor is confirmed to be exactly what you want.

## Before this goes to production

- Swap `provider = "sqlite"` for `"postgresql"` in `prisma/schema.prisma` and point
  `DATABASE_URL` at a free Supabase or Neon Postgres instance — SQLite is fine for local dev,
  not for a real multi-user deploy.
- Run `npm audit` — a couple of the pinned dependency versions (Next.js, PostCSS) have known
  advisories. None are exploitable in a normal Vercel deploy of a private hobby app, but worth
  bumping before you share the link widely.
- Replace the name-only login (`lib/auth.ts`) with something slightly sturdier before this is
  public-facing — it's intentionally bare-bones for a private friend-group MVP.
- Deploy: push this to a GitHub repo, import it into Vercel, set `DATABASE_URL` in Vercel's
  environment variables, done. Vercel's free tier covers this comfortably at 18 users.

## Project structure

```
app/
  survivor/            — hub page + [roundId] roster builder
  ats/ ou/ dk-slates/   — stub pages
  api/survivor/         — state, pick, leaderboard routes
  login/                — self-serve name-based sign-in
lib/
  scoring.ts            — kicker formula, round-total math (pure functions, unit-testable)
  db.ts                 — Prisma client singleton
  auth.ts               — cookie-based current-user lookup
prisma/
  schema.prisma         — full data model
  seed.ts                — mock teams/players/rounds/kicker stats + participant list
```
