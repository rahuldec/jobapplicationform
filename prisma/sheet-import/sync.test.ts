import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import type { PrismaClient } from "../../src/generated/prisma/client";
import { syncTenantSheet, parseSheetDateTime } from "./sync";
import type { SheetImportConfig } from "./types";

// syncTenantSheet does real network (fetch the Sheet export) and real
// Prisma I/O. Testing it against a live database would make these tests
// slow, order-dependent, and unable to run in CI without credentials —
// so this fakes both: an in-memory store standing in for the tables
// sync.ts actually touches, and a mocked fetch serving a real XLSX
// buffer built in-memory. The goal is to catch a wrong-numbering or
// wrong-skip regression in this file, not to test Postgres itself.

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

type FakeRow = Record<string, unknown>;

function createFakePrisma(tenant: FakeRow) {
  const db = {
    tenants: [tenant] as FakeRow[],
    applicationForms: [] as FakeRow[],
    departments: [] as FakeRow[],
    jobs: [] as FakeRow[],
    candidates: [] as FakeRow[],
    applications: [] as FakeRow[],
    fieldValues: [] as FakeRow[],
    documents: [] as FakeRow[],
    auditLogs: [] as FakeRow[],
  };

  const prisma = {
    tenant: {
      findUniqueOrThrow: async ({ where }: { where: { slug: string } }) => {
        const t = db.tenants.find((t) => t.slug === where.slug);
        if (!t) throw new Error(`No tenant "${where.slug}"`);
        return t;
      },
    },
    applicationForm: {
      findFirst: async ({ where }: { where: { tenantId: string; name: string } }) =>
        db.applicationForms.find((f) => f.tenantId === where.tenantId && f.name === where.name) ?? null,
      create: async ({ data }: { data: FakeRow }) => {
        const form = { id: nextId("form"), tenantId: data.tenantId, name: data.name, sections: [] as FakeRow[] };
        db.applicationForms.push(form);
        return form;
      },
    },
    formSection: {
      create: async ({ data }: { data: FakeRow }) => {
        const section = { id: nextId("section"), formId: data.formId, name: data.name, order: data.order, fields: [] as FakeRow[] };
        return section;
      },
    },
    formField: {
      create: async ({ data }: { data: FakeRow }) => ({ id: nextId("field"), ...data }),
    },
    department: {
      findFirst: async ({ where }: { where: { tenantId: string; name: string } }) =>
        db.departments.find((d) => d.tenantId === where.tenantId && d.name === where.name) ?? null,
      create: async ({ data }: { data: FakeRow }) => {
        const dept = { id: nextId("dept"), ...data };
        db.departments.push(dept);
        return dept;
      },
    },
    job: {
      findFirst: async ({ where }: { where: { tenantId: string; title: string } }) =>
        db.jobs.find((j) => j.tenantId === where.tenantId && j.title === where.title) ?? null,
      create: async ({ data }: { data: FakeRow }) => {
        const job = { id: nextId("job"), ...data };
        db.jobs.push(job);
        return job;
      },
    },
    application: {
      findMany: async ({ where }: { where: { tenantId: string } }) =>
        db.applications
          .filter((a) => a.tenantId === where.tenantId)
          .map((a) => ({
            applicationNumber: a.applicationNumber,
            candidate: { email: db.candidates.find((c) => c.id === a.candidateId)?.email ?? "" },
          })),
      create: async ({ data }: { data: FakeRow }) => {
        const app = { id: nextId("app"), ...data };
        db.applications.push(app);
        return app;
      },
    },
    candidate: {
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { tenantId_email: { tenantId: string; email: string } };
        update: FakeRow;
        create: FakeRow;
      }) => {
        const existing = db.candidates.find(
          (c) => c.tenantId === where.tenantId_email.tenantId && c.email === where.tenantId_email.email,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const cand = { id: nextId("cand"), ...create };
        db.candidates.push(cand);
        return cand;
      },
    },
    applicationFieldValue: {
      createMany: async ({ data }: { data: FakeRow[] }) => {
        db.fieldValues.push(...data);
        return { count: data.length };
      },
    },
    document: {
      createMany: async ({ data }: { data: FakeRow[] }) => {
        db.documents.push(...data);
        return { count: data.length };
      },
    },
    auditLog: {
      createMany: async ({ data }: { data: FakeRow[] }) => {
        db.auditLogs.push(...data);
        return { count: data.length };
      },
    },
    $queryRawUnsafe: async (_sql: string, regexPattern: string, tenantId: string, likePattern: string) => {
      // Emulates: SELECT MAX(CAST(SUBSTRING("applicationNumber" FROM $1) AS INTEGER))
      //           FROM applications WHERE "tenantId" = $2 AND "applicationNumber" LIKE $3
      const prefix = likePattern.slice(0, -1); // strip the trailing "%"
      const regex = new RegExp(regexPattern);
      let max: number | null = null;
      for (const a of db.applications) {
        if (a.tenantId !== tenantId) continue;
        const appNumber = a.applicationNumber as string;
        if (!appNumber.startsWith(prefix)) continue;
        const m = appNumber.match(regex);
        if (m) {
          const n = parseInt(m[1], 10);
          if (max === null || n > max) max = n;
        }
      }
      return [{ max_row_index: max }];
    },
  };

  return { prisma: prisma as unknown as PrismaClient, db };
}

function xlsxBufferFrom(headerRow: unknown[], dataRows: unknown[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function mockFetchWithSheet(headerRow: unknown[], dataRows: unknown[][]) {
  const buf = xlsxBufferFrom(headerRow, dataRows);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    })),
  );
}

const BASE_CONFIG: SheetImportConfig = {
  formName: "Test Form",
  applicationNumberPrefix: "T-",
  jobTitleTemplate: "{value}",
  jobCodeTemplate: "",
  jobEmploymentType: "Regular",
  coreFields: {
    addedTimeCol: 0,
    emailCol: 1,
    fullNameCol: 2,
    mobileCol: null,
    dobCol: null,
    genderCol: null,
    jobSelectorCol: 3,
    applicationNumberCol: null,
  },
  sections: [{ name: "Personal Details", fields: [{ col: 4, fieldKey: "notes", label: "Notes", fieldType: "text" }] }],
  documents: [{ col: 5, label: "Photo" }],
};

function makeTenant(overrides: Partial<FakeRow> = {}, config: SheetImportConfig = BASE_CONFIG) {
  return {
    id: "tenant_1",
    slug: "acme",
    sheetSourceUrl: "https://docs.google.com/spreadsheets/d/abc123/export?format=xlsx",
    sheetMappingJson: JSON.stringify(config),
    ...overrides,
  };
}

beforeEach(() => {
  idCounter = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncTenantSheet — row-position numbering (no unique-ID column)", () => {
  const rows = [
    [new Date(2026, 0, 1), "alice@x.com", "Alice A", "Commerce", "note1", "https://drive.google.com/x1"],
    [new Date(2026, 0, 2), "bob@x.com", "Bob B", "Science", "note2", null],
    [new Date(2026, 0, 3), "", "", "Commerce", "note3", null], // missing email/name -> should be skipped
  ];

  it("numbers applications sequentially by row position, skips incomplete rows, and reports counts", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma, db } = createFakePrisma(makeTenant());

    const result = await syncTenantSheet(prisma, "acme");

    expect(result).toEqual({ created: 2, skipped: 1, alreadyImported: 0 });
    expect(db.applications.map((a) => a.applicationNumber)).toEqual(["T-0001", "T-0002"]);
  });

  it("creates one Job/Department per unique selector value", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma, db } = createFakePrisma(makeTenant());

    await syncTenantSheet(prisma, "acme");

    expect(db.jobs.map((j) => j.title).sort()).toEqual(["Commerce", "Science"]);
    expect(db.departments.map((d) => d.name).sort()).toEqual(["Commerce", "Science"]);
  });

  it("leaves job.code null when jobCodeTemplate is not set", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma, db } = createFakePrisma(makeTenant());

    await syncTenantSheet(prisma, "acme");

    expect(db.jobs.every((j) => j.code === null)).toBe(true);
  });

  it("populates field values and documents only for columns with real data", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma, db } = createFakePrisma(makeTenant());

    await syncTenantSheet(prisma, "acme");

    expect(db.fieldValues.map((f) => f.valueText)).toEqual(["note1", "note2"]);
    expect(db.documents).toHaveLength(1);
    expect(db.documents[0].externalUrl).toBe("https://drive.google.com/x1");
    expect(db.documents[0].documentType).toBe("Photo");
  });

  it("writes one audit log entry per created application, not per row", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma, db } = createFakePrisma(makeTenant());

    await syncTenantSheet(prisma, "acme");

    expect(db.auditLogs).toHaveLength(2);
    expect(db.auditLogs.every((a) => a.action === "application.submitted")).toBe(true);
  });

  it("is idempotent: re-running with the same data creates nothing new", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma } = createFakePrisma(makeTenant());
    await syncTenantSheet(prisma, "acme");

    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const second = await syncTenantSheet(prisma, "acme");

    // The skipped 3rd row's number was never actually created, so
    // tracking resumes from the highest number that WAS created (2),
    // and only the still-incomplete row 3 gets retried.
    expect(second).toEqual({ created: 0, skipped: 1, alreadyImported: 2 });
  });

  it("reuses the existing ApplicationForm on a second run instead of creating a duplicate", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma, db } = createFakePrisma(makeTenant());
    await syncTenantSheet(prisma, "acme");

    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    await syncTenantSheet(prisma, "acme");

    expect(db.applicationForms).toHaveLength(1);
  });

  it("returns immediately with zero DB writes when nothing is new", async () => {
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma } = createFakePrisma(makeTenant());
    await syncTenantSheet(prisma, "acme");

    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows.slice(0, 2)); // no new rows at all
    const result = await syncTenantSheet(prisma, "acme");

    expect(result).toEqual({ created: 0, skipped: 0, alreadyImported: 2 });
  });

  it("reconciles the existing form when the config changes after the form already exists, instead of crashing (regression: real production bug)", async () => {
    // An admin editing the Sheet mapping in the builder after the first
    // sync already created the ApplicationForm used to crash every
    // subsequent sync: the old code assumed form.sections[i] still lined
    // up by array position with the (now different) config.sections[i].
    const tenantObj = makeTenant();
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo"], rows);
    const { prisma, db } = createFakePrisma(tenantObj);
    await syncTenantSheet(prisma, "acme");
    expect(db.applicationForms[0].sections).toHaveLength(1);

    const changedConfig: SheetImportConfig = {
      ...BASE_CONFIG,
      sections: [
        ...BASE_CONFIG.sections,
        { name: "Contact Info", fields: [{ col: 6, fieldKey: "altPhone", label: "Alternate Phone", fieldType: "text" }] },
      ],
    };
    tenantObj.sheetMappingJson = JSON.stringify(changedConfig);

    const newRow = [new Date(2026, 0, 4), "carol@x.com", "Carol C", "Commerce", "note4", null, "9999999999"];
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo", "Alt Phone"], [...rows, newRow]);

    await expect(syncTenantSheet(prisma, "acme")).resolves.not.toThrow();

    expect(db.applicationForms).toHaveLength(1);
    expect((db.applicationForms[0].sections as { name: string }[]).map((s) => s.name)).toEqual(["Personal Details", "Contact Info"]);
    expect(db.fieldValues.some((f) => f.valueText === "9999999999")).toBe(true);
  });
});

describe("syncTenantSheet — Sheet-provided unique-ID numbering", () => {
  const idConfig: SheetImportConfig = {
    ...BASE_CONFIG,
    applicationNumberPrefix: "",
    coreFields: { ...BASE_CONFIG.coreFields, applicationNumberCol: 6 },
  };

  it("uses the Sheet's own ID column as the application number", async () => {
    const rows = [
      [new Date(), "alice@x.com", "Alice A", "Commerce", "note1", null, "AC-1"],
      [new Date(), "bob@x.com", "Bob B", "Science", "note2", null, "AC-2"],
    ];
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo", "ID"], rows);
    const { prisma, db } = createFakePrisma(makeTenant({}, idConfig));

    const result = await syncTenantSheet(prisma, "acme");

    expect(result).toEqual({ created: 2, skipped: 0, alreadyImported: 0 });
    expect(db.applications.map((a) => a.applicationNumber).sort()).toEqual(["AC-1", "AC-2"]);
  });

  it("matches already-imported rows by exact ID, independent of row order", async () => {
    const firstRun = [[new Date(), "alice@x.com", "Alice A", "Commerce", "note1", null, "AC-1"]];
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo", "ID"], firstRun);
    const { prisma, db } = createFakePrisma(makeTenant({}, idConfig));
    await syncTenantSheet(prisma, "acme");

    // A new row is inserted BEFORE the already-imported one -- row-position
    // numbering would misread this as "not yet imported"; ID-based
    // matching should still recognize AC-1 and only add AC-2.
    const secondRun = [
      [new Date(), "carol@x.com", "Carol C", "Science", "note3", null, "AC-2"],
      [new Date(), "alice@x.com", "Alice A", "Commerce", "note1", null, "AC-1"],
    ];
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo", "ID"], secondRun);
    const result = await syncTenantSheet(prisma, "acme");

    expect(result.created).toBe(1);
    expect(db.applications.map((a) => a.applicationNumber).sort()).toEqual(["AC-1", "AC-2"]);
  });

  it("disambiguates instead of dropping a row whose ID collides with a DIFFERENT candidate's existing application (regression: real production bug)", async () => {
    // Real scenario: a tenant's Sheet was swapped for a new one that reuses
    // the same ID numbering scheme as the old one. A new candidate's row
    // landing on an ID already claimed by an unrelated, already-imported
    // application must still come through — not vanish silently.
    const firstRun = [[new Date(), "alice@x.com", "Alice A", "Commerce", "note1", null, "AC-1"]];
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo", "ID"], firstRun);
    const { prisma, db } = createFakePrisma(makeTenant({}, idConfig));
    await syncTenantSheet(prisma, "acme");

    const secondRun = [
      [new Date(), "alice@x.com", "Alice A", "Commerce", "note1", null, "AC-1"],
      [new Date(), "dave@x.com", "Dave D", "Science", "note4", null, "AC-1"],
    ];
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo", "ID"], secondRun);
    const result = await syncTenantSheet(prisma, "acme");

    expect(result.created).toBe(1);
    expect(db.applications).toHaveLength(2);
    const dave = db.applications.find((a) => a.applicationNumber !== "AC-1");
    expect(dave?.applicationNumber).toBe("AC-1-2");
  });

  it("skips a row with no value in the ID column", async () => {
    const rows = [
      [new Date(), "alice@x.com", "Alice A", "Commerce", "note1", null, null],
      [new Date(), "bob@x.com", "Bob B", "Science", "note2", null, "AC-2"],
    ];
    mockFetchWithSheet(["Added", "Email", "Name", "Post", "Notes", "Photo", "ID"], rows);
    const { prisma, db } = createFakePrisma(makeTenant({}, idConfig));

    await syncTenantSheet(prisma, "acme");

    expect(db.applications).toHaveLength(1);
    expect(db.applications[0].applicationNumber).toBe("AC-2");
  });
});

describe("parseSheetDateTime", () => {
  // Regression: a real "submitted the application" activity timestamp
  // showed up in the future. Root cause was xlsx's own `cellDates: true`
  // conversion resolving a sheet's timezone-less date serial using the
  // *executing process's* local timezone rather than the sheet's (always
  // IST for every college this app syncs) — so the exact same file parsed
  // correctly on an IST dev machine and wrong on Vercel's UTC runtime.
  // These pin down that the fix (manual, IST-explicit decoding) can never
  // vary by the host process's own timezone again.
  const originalTZ = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it("decodes a sheet's date serial as IST and returns the correct UTC instant", () => {
    // Serial for the naive reading "2026-01-01 05:30:00" — what a sheet
    // configured to IST would show for the instant 2026-01-01T00:00:00Z.
    const serial = 46023.22916666667;
    expect(parseSheetDateTime(serial)?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns the identical result no matter what timezone the process itself is running in", () => {
    const serial = 46023.22916666667;
    process.env.TZ = "Asia/Kolkata";
    const fromIST = parseSheetDateTime(serial)?.toISOString();
    process.env.TZ = "UTC";
    const fromUTC = parseSheetDateTime(serial)?.toISOString();
    process.env.TZ = "America/Los_Angeles";
    const fromPT = parseSheetDateTime(serial)?.toISOString();

    expect(fromIST).toBe("2026-01-01T00:00:00.000Z");
    expect(fromUTC).toBe(fromIST);
    expect(fromPT).toBe(fromIST);
  });

  it("returns null for a non-numeric or missing cell", () => {
    expect(parseSheetDateTime(null)).toBeNull();
    expect(parseSheetDateTime(undefined)).toBeNull();
    expect(parseSheetDateTime("not a date")).toBeNull();
  });
});

describe("syncTenantSheet — errors", () => {
  it("throws when the tenant has no sheetSourceUrl/sheetMappingJson configured", async () => {
    const { prisma } = createFakePrisma(makeTenant({ sheetSourceUrl: null, sheetMappingJson: null }));
    await expect(syncTenantSheet(prisma, "acme")).rejects.toThrow(/nothing to sync/);
  });

  it("throws when the Sheet fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));
    const { prisma } = createFakePrisma(makeTenant());
    await expect(syncTenantSheet(prisma, "acme")).rejects.toThrow(/HTTP 404/);
  });
});
