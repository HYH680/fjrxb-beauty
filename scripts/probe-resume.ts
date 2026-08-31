import { join } from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

config({ path: join(process.cwd(), ".env"), override: true });

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({
    where: { email: "2028391318@qq.com" },
  });
  if (!user) throw new Error("no user");
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
  })
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
      productId: "resume-screen",
      message: "帮我筛前端岗位简历，怎么开始？",
      history: [],
    }),
  });
  const data = await res.json();
  console.log(
    JSON.stringify(
      {
        http: res.status,
        model: data.model,
        preview: String(data.reply || data.error || "").slice(0, 240),
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

void main();
