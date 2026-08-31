import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listCatalog } from "@/lib/catalog";
import { serviceModelBoard } from "@/lib/model-catalog";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const products = await listCatalog({ includeHidden: true });
  return NextResponse.json(serviceModelBoard(products));
}
