/**
 * Smoke: verify Runway key + org, optionally submit a tiny text-to-video.
 * Usage: npx tsx scripts/smoke-runway.ts
 *        npx tsx scripts/smoke-runway.ts --generate
 */
import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const { runwayMediaEnabled, runwayOrganizationProbe, generateRunwayVideo } =
    await import("../src/lib/integrations/runway-media");

  if (!runwayMediaEnabled()) {
    console.error("RUNWAY_API_KEY missing");
    process.exit(1);
  }

  console.log("probing organization…");
  const org = await runwayOrganizationProbe();
  console.log("org ok", {
    keys: Object.keys(org || {}).slice(0, 8),
  });

  if (!process.argv.includes("--generate")) {
    console.log("skip generate (pass --generate to burn credits)");
    return;
  }

  console.log("generating 4s text-to-video…");
  const result = await generateRunwayVideo({
    prompt: "A calm product shot of a ceramic mug on a wooden table, soft daylight, slow camera push-in",
    durationSec: 4,
    ratio: "1280:720",
  });
  console.log("ok", {
    model: result.model,
    taskId: result.taskId,
    videoUrl: result.videoUrl?.slice(0, 80) + "…",
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
