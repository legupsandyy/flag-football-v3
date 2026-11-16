import { cookies } from "next/headers";
import { prisma } from "./db";

// MVP auth: a private link shared with 18 friends, each person just picks
// their name from the seeded list — no password. Good enough for a
// friend-group pool; swap for real auth (e.g. Supabase magic link) before
// this handles a bigger or public group.
const COOKIE_NAME = "tourney_user";

export async function getCurrentUser() {
  const userId = cookies().get(COOKIE_NAME)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export function sessionCookieName() {
  return COOKIE_NAME;
}
