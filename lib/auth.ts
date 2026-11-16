import { cookies } from "next/headers";
import { prisma } from "./db";

// Sign-in works like this: a person enters the group password (JOIN_CODE,
// set in Vercel) plus their name. The name is created if it is new. The site
// then remembers them with a cookie, so the password is only needed once per
// device. Every page and API that shows or saves data checks this cookie.
const COOKIE_NAME = "tourney_user";

export async function getCurrentUser() {
  const userId = cookies().get(COOKIE_NAME)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export function sessionCookieName() {
  return COOKIE_NAME;
}
