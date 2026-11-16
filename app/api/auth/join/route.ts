import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { sessionCookieName } from "@/lib/auth";

export const dynamic = "force-dynamic";

function codeMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const expected = process.env.JOIN_CODE;
  if (!expected) {
    return NextResponse.json(
      { error: "The group password hasn't been set up yet. Ask the commissioner." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");

  if (!codeMatches(code, expected.trim())) {
    return NextResponse.json({ error: "That group password isn't right." }, { status: 401 });
  }
  if (name.length < 2 || name.length > 30) {
    return NextResponse.json({ error: "Enter a name between 2 and 30 characters." }, { status: 400 });
  }

  // Same name (any capitalization) signs back in as that person; new name joins.
  let user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (!user) {
    user = await prisma.user.create({ data: { name } });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 120, // 120 days — covers the whole postseason
  });
  return res;
}
