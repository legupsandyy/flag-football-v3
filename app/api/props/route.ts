import { NextResponse } from "next/server";

// Super Bowl props were removed.
export async function GET() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
export async function POST() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
