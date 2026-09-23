"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TENANT_COOKIE } from "@/lib/tenant";
import { validateTenantCredentials, TENANT_AUTH_COOKIE } from "@/lib/tenant-auth";

export async function loginToTenant(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    redirect(`/${slug}?error=1`);
  }

  let valid: boolean;
  try {
    valid = await validateTenantCredentials(slug, username, password);
  } catch (err) {
    console.error(`[tenant-auth] Failed to validate credentials for "${slug}":`, err);
    redirect(`/${slug}?error=2`);
  }
  if (!valid) {
    redirect(`/${slug}?error=1`);
  }

  const store = await cookies();
  store.set(TENANT_COOKIE, tenant.id, { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: false });
  store.set(TENANT_AUTH_COOKIE, tenant.id, { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: true });

  // Credentials are a single shared username/password per tenant (see
  // validateTenantCredentials), not per staff member, so this is the only
  // signal the admin-side activity feed has for "this client logged in" —
  // there's no individual user identity to attribute it to.
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorName: tenant.name,
      action: "tenant.login",
      entityType: "Tenant",
      entityId: tenant.id,
    },
  });

  redirect("/dashboard");
}
