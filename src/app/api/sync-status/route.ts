import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logPath = join(homedir(), "sync.log");
    const content = readFileSync(logPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      totalLines: lines.length,
      lastRuns: lines.slice(-10).reverse(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read sync log" },
      { status: 500 }
    );
  }
}
