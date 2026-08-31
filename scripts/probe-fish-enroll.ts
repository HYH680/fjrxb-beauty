import { writeFileSync } from "fs";
import { join } from "path";
import { File } from "node:buffer";
import { config } from "dotenv";
import { ProxyAgent, fetch as ufetch, FormData } from "undici";

config({ path: join(process.cwd(), ".env"), override: true });

async function main() {
  const key = process.env.FISH_API_KEY!;
  const agent = new ProxyAgent(process.env.HTTPS_PROXY!);

  const tts = await ufetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    dispatcher: agent,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      model: "s2-pro",
    },
    body: JSON.stringify({
      text: "周末双人套餐上线，欢迎到店品尝拿铁，欢迎周末带家人来坐坐。谢谢大家。",
      reference_id: "9a9cf47702da476aa4629e2506d4a857",
      format: "mp3",
    }),
  });
  console.log("tts", tts.status, tts.headers.get("content-type"));
  if (!tts.ok) {
    console.log(await tts.text());
    process.exit(1);
  }
  const audio = Buffer.from(await tts.arrayBuffer());
  writeFileSync(join("scripts", "smoke-fish-sample.mp3"), audio);
  console.log("sampleBytes", audio.length);

  const fd = new FormData();
  fd.set("type", "tts");
  fd.set("title", "ShopFishDemo");
  fd.set("visibility", "private");
  fd.set("train_mode", "fast");
  fd.set(
    "voices",
    new File([audio], "sample.mp3", { type: "audio/mpeg" })
  );

  const en = await ufetch("https://api.fish.audio/model", {
    method: "POST",
    dispatcher: agent,
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  const text = await en.text();
  console.log("enroll", en.status, text.slice(0, 800));
  if (!en.ok) process.exit(1);

  const data = JSON.parse(text) as { _id?: string };
  const speak = await ufetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    dispatcher: agent,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      model: "s2-pro",
    },
    body: JSON.stringify({
      text: "这是 Fish Audio 克隆试听，欢迎周末来店。",
      reference_id: data._id,
      format: "mp3",
    }),
  });
  console.log("clone-tts", speak.status);
  if (!speak.ok) {
    console.log(await speak.text());
    process.exit(1);
  }
  writeFileSync(
    join("scripts", "smoke-fish-clone.mp3"),
    Buffer.from(await speak.arrayBuffer())
  );
  console.log("clone ok voice=", data._id);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
