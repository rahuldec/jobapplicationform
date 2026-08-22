import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Authentication/login is intentionally out of scope for this phase (see
// product decision log). This module stands in for "who is the current
// college" so every query in the app can still be tenant-scoped from day
// one — swapping this for a real session lookup later does not require
// touching any query that already calls getCurrentTenant().
const TENANT_COOKIE = "tenant_id";

export async function getCurrentTenant() {
  const store = await cookies();
  const cookieTenantId = store.get(TENANT_COOKIE)?.value;

  if (cookieTenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: cookieTenantId } });
    if (tenant) return tenant;
  }

  const first = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!first) {
    throw new Error("No tenant exists yet. Run the seed script.");
  }
  return first;
}

export async function listTenants() {
  return prisma.tenant.findMany({ orderBy: { createdAt: "asc" } });
}

export { TENANT_COOKIE };
