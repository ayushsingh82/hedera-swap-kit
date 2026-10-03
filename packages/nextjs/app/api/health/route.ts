import { NextResponse } from "next/server";

/** Liveness check: returns 200 once the app is serving requests. */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
