"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { TenantBranding } from "@/lib/branding";
import { toSheetExportUrl, type SheetImportConfig } from "../../../prisma/sheet-import/types";
import { autoMapSheetColumns, type AutoMapResult } from "../../../prisma/sheet-import/auto-map";
import { findApplicationsNotInSheet, type FindRemovedResult } from "../../../prisma/sheet-import/sync";

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

export type AutoMapActionResult = ({ ok: true } & AutoMapResult) | { ok: false; error: string };

// Fetches the Sheet's header row (+ one sample data row) and runs the
// keyword-matching heuristic in prisma/sheet-import/auto-map.ts to build
// a starting SheetImportConfig — so an admin pasting a new client's Sheet
// doesn't have to hand-type every column number. Purely a suggestion:
// nothing is saved here, the caller reviews/edits it in the builder and
// saves via updateTenantSheetConfig when ready.
//
// Returns a result object instead of throwing — a thrown error here is an
// "uncaught exception" as far as the Server Action boundary is concerned,
// and Next.js replaces its message with a generic digest-only one in
// production (see node_modules/next/dist/docs/01-app/01-getting-started/
// 10-error-handling.md — "model expected errors as return values"), which
// is exactly why a real, actionable message like "this Sheet isn't
// shared" was showing as an unhelpful "Minified React error #441" in
// production while working fine locally in dev (where messages aren't
// masked).
export async function autoMapTenantSheet(sheetSourceUrl: string): Promise<AutoMapActionResult> {
  const url = toSheetExportUrl(sheetSourceUrl.trim());
  if (!url) return { ok: false, error: "Enter a Sheet export URL first." };

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, error: "Couldn't reach that Sheet — check the URL and your connection, then try again." };
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          'This Sheet isn\'t publicly accessible (Google returned "not authorized"). Open it in Google Sheets, click Share, and set general access to "Anyone with the link can view" — then try again.',
      };
    }
    return { ok: false, error: `Failed to fetch the Sheet: HTTP ${res.status}` };
  }

  try {
    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { cellDates: true, type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
    const [headerRow, ...dataRows] = rows;
    if (!headerRow || headerRow.length === 0) return { ok: false, error: "Couldn't find a header row in that Sheet." };

    return { ok: true, ...autoMapSheetColumns(headerRow, dataRows.slice(0, 15)) };
  } catch {
    return { ok: false, error: "Couldn't read that Sheet as a spreadsheet — check the URL points to a real Google Sheet." };
  }
}

// Read-only check: which of this tenant's applications no longer have a
// matching row in the live Sheet (deleted, or their ID cell cleared)?
// syncTenantSheet itself never removes anything for exactly this reason
// (safe to run unattended) — this is the deliberate, human-reviewed
// counterpart for a client who actually wants those gone.
export async function checkApplicationsRemovedFromSheet(tenantSlug: string): Promise<FindRemovedResult> {
  return findApplicationsNotInSheet(prisma, tenantSlug);
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

// Unchecked checkboxes submit no key at all in a plain <form>, so absence
// of the field (not an explicit "false") means off.
export async function updateSynopsisEmbedDocuments(formData: FormData) {
  const tenantId = String(formData.get("tenantId"));
  const embed = formData.get("synopsisEmbedDocuments") === "on";

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { synopsisEmbedDocuments: embed },
  });

  revalidatePath(`/admin/${tenantId}`);
}

// Called directly from a client component, not a plain <form action>,
// since the Sheet mapping needs live client-side state before the admin
// ever hits Save.
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
