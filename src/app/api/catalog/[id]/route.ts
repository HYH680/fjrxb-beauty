import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { updateCatalogProduct } from "@/lib/catalog";
import { catalogPatchSchema, firstZodError } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = catalogPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  try {
    const product = await updateCatalogProduct(id, parsed.data);
    if (!product) {
      return NextResponse.json({ error: "服务不存在" }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "保存目录失败" }, { status: 500 });
  }
}
