import { afterEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { validateTenantCredentials } from "./tenant-auth";

function fakeCredentialsSheetBuffer(rows: [string, string, string][]) {
  const sheet = XLSX.utils.aoa_to_sheet([["tenant", "username", "password"], ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("validateTenantCredentials", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws when CREDENTIALS_SHEET_URL isn't configured", async () => {
    vi.stubEnv("CREDENTIALS_SHEET_URL", "");
    await expect(validateTenantCredentials("dn", "dn", "dn@123")).rejects.toThrow("CREDENTIALS_SHEET_URL is not configured");
  });

  it("returns true for a matching tenant/username/password row", async () => {
    vi.stubEnv("CREDENTIALS_SHEET_URL", "https://docs.google.com/spreadsheets/d/abc123/edit?usp=sharing");
    const buf = fakeCredentialsSheetBuffer([
      ["nbgsm", "nbgsm", "nbgsm@123"],
      ["dnch", "dnch", "dnch@123"],
    ]);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => buf })));

    await expect(validateTenantCredentials("dnch", "dnch", "dnch@123")).resolves.toBe(true);
  });

  it("returns false for a wrong password on an existing tenant", async () => {
    vi.stubEnv("CREDENTIALS_SHEET_URL", "https://docs.google.com/spreadsheets/d/abc123/edit?usp=sharing");
    const buf = fakeCredentialsSheetBuffer([["dnch", "dnch", "dnch@123"]]);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => buf })));

    await expect(validateTenantCredentials("dnch", "dnch", "wrong-password")).resolves.toBe(false);
  });

  it("returns false for a tenant slug not present in the sheet", async () => {
    vi.stubEnv("CREDENTIALS_SHEET_URL", "https://docs.google.com/spreadsheets/d/abc123/edit?usp=sharing");
    const buf = fakeCredentialsSheetBuffer([["dnch", "dnch", "dnch@123"]]);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => buf })));

    await expect(validateTenantCredentials("unknown-tenant", "dnch", "dnch@123")).resolves.toBe(false);
  });

  it("matches the tenant slug case-insensitively", async () => {
    vi.stubEnv("CREDENTIALS_SHEET_URL", "https://docs.google.com/spreadsheets/d/abc123/edit?usp=sharing");
    const buf = fakeCredentialsSheetBuffer([["DnCh", "dnch", "dnch@123"]]);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => buf })));

    await expect(validateTenantCredentials("dnch", "dnch", "dnch@123")).resolves.toBe(true);
  });

  it("throws when the sheet fetch fails", async () => {
    vi.stubEnv("CREDENTIALS_SHEET_URL", "https://docs.google.com/spreadsheets/d/abc123/edit?usp=sharing");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));

    await expect(validateTenantCredentials("dnch", "dnch", "dnch@123")).rejects.toThrow("HTTP 404");
  });
});
