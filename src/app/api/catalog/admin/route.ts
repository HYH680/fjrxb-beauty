import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listCatalog } from "@/lib/catalog";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const products = await listCatalog({ includeHidden: true });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "读取目录失败" }, { status: 500 });
  }
}
