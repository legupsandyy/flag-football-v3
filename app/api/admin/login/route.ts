import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCodeMatches, adminToken } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const token = adminToken();
  if (!token) {
    return NextResponse.json(
      { error: "ADMIN_CODE is not set in Vercel yet. Add it under Settings → Environment Variables, then redeploy." },
      { status: 500 }
    );
  }
  const { code } = await req.json().catch(() => ({ code: "" }));
  if (typeof code !== "string" || !adminCodeMatches(code)) {
    return NextResponse.json({ error: "Wrong admin password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 120,
  });
  return res;
}
