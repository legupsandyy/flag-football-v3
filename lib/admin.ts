import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

// Admin access works like the group password: set ADMIN_CODE in Vercel, enter it
// once on /admin, and this browser is remembered.
export const ADMIN_COOKIE = "tourney_admin";

export function adminToken(): string | null {
  const code = process.env.ADMIN_CODE;
  if (!code) return null;
  return createHash("sha256").update("admin:" + code).digest("hex");
}

export function adminCodeMatches(input: string): boolean {
  const code = process.env.ADMIN_CODE;
  if (!code) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(code).digest();
  return timingSafeEqual(a, b);
}

export function isAdmin(): boolean {
  const token = adminToken();
  if (!token) return false;
  return cookies().get(ADMIN_COOKIE)?.value === token;
}
