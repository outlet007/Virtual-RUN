import "server-only";

import { timingSafeEqual } from "node:crypto";
import { runEvidenceCleanup } from "@/lib/evidence-retention-service";

export const dynamic = "force-dynamic";

function authorized(request: Request, secret: string) {
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const secret = process.env.EVIDENCE_RETENTION_CRON_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ error: "Evidence retention cron is not configured" }, { status: 503 });
  }
  if (!authorized(request, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEvidenceCleanup({
      requestedBy: null,
      source: "cron",
      limit: 1000,
    });
    return Response.json(result);
  } catch (error) {
    console.error("Scheduled evidence cleanup failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "Evidence cleanup failed" }, { status: 500 });
  }
}
