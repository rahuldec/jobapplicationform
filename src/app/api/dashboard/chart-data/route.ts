import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const tenant = await getCurrentTenant();
  const fieldKey = req.nextUrl.searchParams.get("fieldKey");
  if (!fieldKey) return NextResponse.json({ error: "fieldKey required" }, { status: 400 });

  // Find the field — it must belong to this tenant's form
  const field = await prisma.formField.findFirst({
    where: { fieldKey, section: { form: { tenantId: tenant.id } } },
    select: { id: true },
  });
  if (!field) return NextResponse.json({ data: [] });

  const groups = await prisma.applicationFieldValue.groupBy({
    by: ["valueText"],
    where: { fieldId: field.id, valueText: { not: null }, AND: [{ valueText: { not: "" } }] },
    _count: { _all: true },
    orderBy: { _count: { valueText: "desc" } },
    take: 20,
  });

  const data = groups
    .filter((g) => g.valueText)
    .map((g) => ({ label: g.valueText as string, count: g._count._all }));

  return NextResponse.json({ data });
}
