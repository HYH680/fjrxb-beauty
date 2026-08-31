const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "2028391318@qq.com" },
    include: { subscriptions: true },
  });

  if (!user) {
    console.log("用户不存在");
    return;
  }

  console.log("用户:", user.name, user.email);
  console.log("已开通服务数:", user.subscriptions.length);
  console.log("---");

  const { products } = require("./src/data/products.ts");
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const sub of user.subscriptions) {
    const p = productMap.get(sub.productId);
    if (p) {
      const runtime = p.runtime ? `${p.runtime.provider}/${p.runtime.model}` : "无运行时";
      const access = p.access || "—";
      console.log(`  [${sub.status}] ${p.name} | ${access} | ${runtime}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
