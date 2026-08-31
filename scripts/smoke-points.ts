import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { email: "2028391318@qq.com" } });
  if (!user) throw new Error("no user");
  const token = await new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const res = await fetch("http://localhost:3000/api/runtime/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ai-supermarket-session=${token}`,
    },
    body: JSON.stringify({
      productId: "capcut-auto",
      message: "你好",
      history: [],
      model: "gpt-5.6-sol",
    }),
  });
  const data = await res.json();
  console.log(
    JSON.stringify(
      {
        status: res.status,
        model: data.model,
        route: data.route,
        clearManualModel: data.clearManualModel,
        reply: String(data.reply || data.error || "").slice(0, 200),
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main();
