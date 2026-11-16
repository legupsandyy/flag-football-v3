import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sessionCookieName } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 120, // 120 days — covers the whole postseason
  });
  return res;
}
