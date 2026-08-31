import { redirect } from "next/navigation";

// 「场景集合」已收进「服务」页的二级视图，这里保留旧路由做重定向，兼容书签与外链。
export default function CollectionsPage() {
  redirect("/products?tab=collections");
}
