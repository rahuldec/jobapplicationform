import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { toSheetExportUrl } from "../../prisma/sheet-import/types";

// Separate from TENANT_COOKIE (src/lib/tenant.ts), which just remembers
// which institution this browser last selected — this one records that a
// login for that specific tenant actually succeeded. httpOnly since it's
// never read client-side, unlike the tenant-selection cookie.
export const TENANT_AUTH_COOKIE = "tenant_auth_id";

type CredentialRow = { tenant?: unknown; username?: unknown; password?: unknown };

// Fetched live on every login attempt rather than cached/synced into the
// database — this is a small, rarely-hit sheet (one row per institution),
// so there's no real cost, and it means a password changed in the Sheet
// takes effect on the very next login with no separate sync step.
async function fetchCredentialRows(): Promise<CredentialRow[]> {
  const sheetUrl = process.env.CREDENTIALS_SHEET_URL;
  if (!sheetUrl) throw new Error("CREDENTIALS_SHEET_URL is not configured");

  const url = toSheetExportUrl(sheetUrl);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch credentials sheet: HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<CredentialRow>(sheet);
}

export async function validateTenantCredentials(tenantSlug: string, username: string, password: string): Promise<boolean> {
  const rows = await fetchCredentialRows();
  return rows.some(
    (row) =>
      String(row.tenant ?? "").trim().toLowerCase() === tenantSlug.trim().toLowerCase() &&
      String(row.username ?? "").trim() === username.trim() &&
      String(row.password ?? "") === password,
  );
}

export async function isTenantAuthenticated(tenantId: string): Promise<boolean> {
  const store = await cookies();
  return store.get(TENANT_AUTH_COOKIE)?.value === tenantId;
}
