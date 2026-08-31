import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/catalog";

export async function GET() {
  try {
    const products = await listCatalog();
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "读取目录失败" }, { status: 500 });
  }
}
