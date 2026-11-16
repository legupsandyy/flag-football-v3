import { NextResponse } from "next/server";

// Retired: sign-in now happens through /api/auth/join with the group password.
export async function POST() {
  return NextResponse.json({ error: "Gone" }, { status: 410 });
}
