"use server";

import { cookies } from "next/headers";
import { TENANT_COOKIE } from "@/lib/tenant";

// Setting a cookie inside a Server Action makes Next.js re-render the
// current page and layouts server-side, so no explicit refresh/redirect
// is needed here.
export async function switchTenant(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) return;
  const store = await cookies();
  store.set(TENANT_COOKIE, tenantId, { path: "/" });
}
