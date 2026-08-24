import { NextRequest, NextResponse } from "next/server";
import { syncNbgsmSheet } from "../../../../prisma/import-nbgsm-sheet";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Vercel Cron automatically sends "Authorization: Bearer $CRON_SECRET"
  // when that env var is set on the project — no extra wiring needed for
  // scheduled invocations, only for manual ones.
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncNbgsmSheet();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Sheet sync failed:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
