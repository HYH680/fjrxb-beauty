import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: join(process.cwd(), ".env"), override: true });

async function main() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("no ELEVENLABS_API_KEY");
  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: "Hello from ElevenLabs. Weekend set is ready.",
      model_id: "eleven_multilingual_v2",
    }),
  });
  console.log("tts", r.status, r.headers.get("content-type"));
  if (!r.ok) {
    console.log((await r.text()).slice(0, 800));
    process.exit(1);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(join(process.cwd(), "scripts", "smoke-elevenlabs-direct.mp3"), buf);
  console.log("ttsBytes", buf.length, "ok");
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
