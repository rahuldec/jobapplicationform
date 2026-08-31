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
  if (!tenant || !(await validateTenantCredentials(slug, username, password))) {
    redirect(`/${slug}?error=1`);
  }

  const store = await cookies();
  store.set(TENANT_COOKIE, tenant.id, { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: false });
  store.set(TENANT_AUTH_COOKIE, tenant.id, { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: true });

  redirect("/dashboard");
}
