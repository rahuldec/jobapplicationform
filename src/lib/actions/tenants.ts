"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { TenantBranding } from "@/lib/branding";
import { toSheetExportUrl, type SheetImportConfig } from "../../../prisma/sheet-import/types";

function slugify(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTenant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  if (!name) throw new Error("Tenant name is required");

  const slug = slugify(rawSlug || name);
  if (!slug) throw new Error("Could not derive a valid slug from that name");

  const tenant = await prisma.tenant.create({ data: { name, slug } });

  revalidatePath("/admin");
  redirect(`/admin/${tenant.id}`);
}

export async function updateTenantBranding(formData: FormData) {
  const tenantId = String(formData.get("tenantId"));
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim();
  const from = String(formData.get("gradientFrom") ?? "").trim();
  const via = String(formData.get("gradientVia") ?? "").trim();
  const to = String(formData.get("gradientTo") ?? "").trim();

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const existing: Partial<TenantBranding> = tenant.brandingJson ? JSON.parse(tenant.brandingJson) : {};

  let logoDataUrl = existing.logoDataUrl ?? null;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const buf = Buffer.from(await logoFile.arrayBuffer());
    logoDataUrl = `data:${logoFile.type || "image/png"};base64,${buf.toString("base64")}`;
  }

  const branding: TenantBranding = {
    name: name || tenant.name,
    shortName: shortName || tenant.name,
    logoDataUrl,
    gradient: {
      from: from || existing.gradient?.from || "#0f2359",
      via: via || existing.gradient?.via || "#1b449c",
      to: to || existing.gradient?.to || "#3465c9",
    },
  };

  // Tenant.name is the canonical identity shown on the admin list/heading
  // (and used as the branding fallback below) — keep it in sync with
  // whatever display name is set here, so it never silently drifts from
  // what the nav bar/PDF actually show.
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { name: branding.name, brandingJson: JSON.stringify(branding) },
  });

  revalidatePath(`/admin/${tenantId}`);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

// Saves just the Sheet source URL, independent of the rest of the mapping
// config — lets an admin lock in a converted export URL immediately
// without first finishing the whole column-mapping form.
export async function updateTenantSheetSourceUrl(input: { tenantId: string; sheetSourceUrl: string }) {
  const trimmedUrl = input.sheetSourceUrl.trim();
  const sheetSourceUrl = trimmedUrl ? toSheetExportUrl(trimmedUrl) : null;

  await prisma.tenant.update({ where: { id: input.tenantId }, data: { sheetSourceUrl } });

  revalidatePath(`/admin/${input.tenantId}`);
  return sheetSourceUrl;
}

export async function updateTenantSheetConfig(input: {
  tenantId: string;
  sheetSourceUrl: string;
  config: SheetImportConfig;
}) {
  const trimmedUrl = input.sheetSourceUrl.trim();
  const sheetSourceUrl = trimmedUrl ? toSheetExportUrl(trimmedUrl) : null;

  await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      sheetSourceUrl,
      sheetMappingJson: JSON.stringify(input.config),
    },
  });

  revalidatePath(`/admin/${input.tenantId}`);
}
