import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from "@/lib/enums";
import { formatDate, startOfTodayIST } from "@/lib/date";

export const maxDuration = 60;

// Mirrors the Applications page's own filter logic exactly, so the export
// always reflects exactly what's currently on screen — the "dynamic" part.
export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant();
  const params = request.nextUrl.searchParams;

  const q = params.get("q") ?? "";
  const jobId = params.get("jobId") ?? "";
  const isToday = params.get("since") === "today";
  const statusList = (params.get("status") ?? "")
    .split(",")
    .filter((s): s is (typeof APPLICATION_STATUSES)[number] => APPLICATION_STATUSES.includes(s as never));
  const hasStatus = statusList.length > 0;

  const where = {
    tenantId: tenant.id,
    status: hasStatus ? { in: statusList } : undefined,
    jobId: jobId || undefined,
    ...(isToday ? (hasStatus ? { updatedAt: { gte: startOfTodayIST() } } : { createdAt: { gte: startOfTodayIST() } }) : {}),
    ...(q
      ? {
          OR: [
            { applicationNumber: { contains: q } },
            { candidate: { fullName: { contains: q } } },
            { candidate: { email: { contains: q } } },
            { candidate: { mobile: { contains: q } } },
          ],
        }
      : {}),
  };

  const applications = await prisma.application.findMany({
    where,
    include: {
      candidate: true,
      job: { include: { department: true } },
      fieldValues: { include: { field: true } },
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (applications.length === 0) {
    return NextResponse.json({ error: "No applications match the current filters." }, { status: 404 });
  }

  // Column order: every dynamic field, first-seen across the result set.
  const fieldColumns: { key: string; label: string }[] = [];
  const seenFields = new Set<string>();
  const docColumns: string[] = [];
  const seenDocs = new Set<string>();
  for (const app of applications) {
    for (const fv of app.fieldValues) {
      if (!seenFields.has(fv.field.label)) {
        seenFields.add(fv.field.label);
        fieldColumns.push({ key: fv.fieldId, label: fv.field.label });
      }
    }
    for (const doc of app.documents) {
      if (!seenDocs.has(doc.documentType)) {
        seenDocs.add(doc.documentType);
        docColumns.push(doc.documentType);
      }
    }
  }

  const rows = applications.map((app) => {
    const fieldByFieldId = new Map(app.fieldValues.map((fv) => [fv.fieldId, fv]));
    const docByType = new Map(app.documents.map((d) => [d.documentType, d.externalUrl ?? d.storageUrl ?? ""]));

    const row: Record<string, string | number> = {
      "Application #": app.applicationNumber,
      "Candidate Name": app.candidate.fullName,
      Email: app.candidate.email,
      Mobile: app.candidate.mobile ?? "",
      "Date of Birth": app.candidate.dateOfBirth ? formatDate(app.candidate.dateOfBirth) : "",
      Gender: app.candidate.gender ?? "",
      Job: app.job.title,
      Department: app.job.department?.name ?? "",
      Status: APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS] ?? app.status,
      "Applied Date": app.submittedAt ? formatDate(app.submittedAt) : "",
    };
    for (const col of fieldColumns) {
      const fv = fieldByFieldId.get(col.key);
      row[col.label] = fv?.valueText ?? (fv?.valueNumber !== null && fv?.valueNumber !== undefined ? fv.valueNumber : "");
    }
    for (const docType of docColumns) {
      row[`Document: ${docType}`] = docByType.get(docType) ?? "";
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const datePart = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="applications-export-${datePart}.xlsx"`,
    },
  });
}
