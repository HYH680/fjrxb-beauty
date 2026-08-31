import type { MetadataRoute } from "next";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/products", "/chat", "/tools/", "/rank", "/collections"],
      disallow: [
        "/account",
        "/checkout",
        "/settings",
        "/use",
        "/api/",
        "/products/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
