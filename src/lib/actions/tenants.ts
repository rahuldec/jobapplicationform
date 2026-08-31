"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { TenantBranding } from "@/lib/branding";
import { toSheetExportUrl, type SheetImportConfig } from "../../../prisma/sheet-import/types";
import { autoMapSheetColumns, type AutoMapResult } from "../../../prisma/sheet-import/auto-map";

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

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
function sanitizeHex(raw: string): string | null {
  const v = raw.trim();
  return HEX_COLOR.test(v) ? v : null;
}

export async function updateTenantBranding(formData: FormData) {
  const tenantId = String(formData.get("tenantId"));
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim();
  const taglineRaw = formData.get("tagline");
  const from = sanitizeHex(String(formData.get("gradientFrom") ?? ""));
  const via = sanitizeHex(String(formData.get("gradientVia") ?? ""));
  const to = sanitizeHex(String(formData.get("gradientTo") ?? ""));

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
    tagline: String(taglineRaw ?? "").trim() || null,
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

// Fetches the Sheet's header row (+ one sample data row) and runs the
// keyword-matching heuristic in prisma/sheet-import/auto-map.ts to build
// a starting SheetImportConfig — so an admin pasting a new client's Sheet
// doesn't have to hand-type every column number. Purely a suggestion:
// nothing is saved here, the caller reviews/edits it in the builder and
// saves via updateTenantSheetConfig when ready.
export async function autoMapTenantSheet(sheetSourceUrl: string): Promise<AutoMapResult> {
  const url = toSheetExportUrl(sheetSourceUrl.trim());
  if (!url) throw new Error("Enter a Sheet export URL first.");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch the Sheet: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { cellDates: true, type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
  const [headerRow, ...dataRows] = rows;
  if (!headerRow || headerRow.length === 0) throw new Error("Couldn't find a header row in that Sheet.");

  return autoMapSheetColumns(headerRow, dataRows.slice(0, 15));
}

// Blank subject/body clears the override and falls back to the built-in
// default wording (see src/lib/email.ts) rather than sending an empty email.
export async function updateInterviewEmailTemplate(formData: FormData) {
  const tenantId = String(formData.get("tenantId"));
  const subject = String(formData.get("interviewEmailSubject") ?? "").trim() || null;
  const body = String(formData.get("interviewEmailBody") ?? "").trim() || null;
  const cc = String(formData.get("interviewEmailCc") ?? "").trim() || null;
  const bcc = String(formData.get("interviewEmailBcc") ?? "").trim() || null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { interviewEmailSubject: subject, interviewEmailBody: body, interviewEmailCc: cc, interviewEmailBcc: bcc },
  });

  revalidatePath(`/admin/${tenantId}`);
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
