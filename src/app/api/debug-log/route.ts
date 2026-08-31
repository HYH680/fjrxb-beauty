import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const LOG = path.join(process.cwd(), "debug-502d57.log");

/** Debug-session ingest fallback when browser cannot reach the local collector. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const line = JSON.stringify({
      sessionId: "502d57",
      ...body,
      timestamp: body?.timestamp ?? Date.now(),
    });
    await mkdir(path.dirname(LOG), { recursive: true });
    await appendFile(LOG, `${line}\n`, "utf8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "log failed" },
      { status: 500 }
    );
  }
}
