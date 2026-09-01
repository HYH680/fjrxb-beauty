import type { NextConfig } from "next";
import path from "node:path";

const onVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  // HK standalone 部署需要；Vercel 用平台默认产物，勿开 standalone
  ...(onVercel ? {} : { output: "standalone" as const }),
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "fjrxb.beauty",
    "www.fjrxb.beauty",
  ],
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    const aliases = [
      ["dall-e-3", "ai-image-make"],
      ["stable-diffusion-xl", "ai-image-make"],
      ["copy-to-image", "ai-image-make"],
      ["ecommerce-image", "ai-image-make"],
      ["weaviate-cloud", "pinecone"],
      ["kling-video", "runway-gen3"],
      ["deepseek-chat", "qwen-plus"],
    ] as const;
    return [
      ...aliases.flatMap(([from, to]) => [
        { source: `/products/${from}`, destination: `/tools/${to}`, permanent: true },
        { source: `/tools/${from}`, destination: `/tools/${to}`, permanent: true },
      ]),
      {
        source: "/products/:id",
        destination: "/tools/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
