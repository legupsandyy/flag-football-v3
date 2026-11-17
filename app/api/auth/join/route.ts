import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { sessionCookieName } from "@/lib/auth";

export const dynamic = "force-dynamic";

function codeMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hashPin(pin: string, secret: string) {
  return createHash("sha256").update(`pin:${pin}:${secret}`).digest("hex");
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
  const pin = String(body.pin ?? "").trim();
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Your PIN must be exactly 4 numbers." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 30) {
    return NextResponse.json({ error: "Enter a name between 2 and 30 characters." }, { status: 400 });
  }

  // Same name (any capitalization) signs back in as that person; new name joins.
  let user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  const pinHash = hashPin(pin, expected.trim());
  if (!user) {
    user = await prisma.user.create({ data: { name, pinHash } });
  } else if (!user.pinHash) {
    // Older account with no PIN yet: the first sign-in sets it.
    user = await prisma.user.update({ where: { id: user.id }, data: { pinHash } });
  } else if (!codeMatches(pinHash, user.pinHash)) {
    return NextResponse.json({ error: "That name is taken and the PIN doesn't match. Use your own PIN, or ask the commissioner to reset it." }, { status: 401 });
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
