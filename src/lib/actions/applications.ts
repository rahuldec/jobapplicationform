"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES } from "@/lib/enums";
import { sendEmail } from "@/lib/email";

function invalidateApplicationsViews() {
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function changeApplicationStatus(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const status = String(formData.get("status"));
  if (!APPLICATION_STATUSES.includes(status as never)) throw new Error("Invalid status");

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: application.tenantId,
      actorName: "Admin",
      action: "application.status_changed",
      entityType: "Application",
      entityId: application.id,
      metadataJson: JSON.stringify({ status }),
    },
  });

  revalidatePath(`/applications/${applicationId}`);
  invalidateApplicationsViews();
}

// Bulk variant of changeApplicationStatus, for the Applications list's
// multi-select toolbar. updateMany can't return the affected rows, so
// audit entries are built from the id list directly rather than from
// each row's real data (candidate name isn't available without a second
// query) — same tradeoff the export routes already make for bulk ops.
export async function bulkChangeApplicationStatus(input: { applicationIds: string[]; status: string }) {
  const { applicationIds, status } = input;
  if (!APPLICATION_STATUSES.includes(status as never)) throw new Error("Invalid status");
  if (applicationIds.length === 0) return { count: 0 };

  const apps = await prisma.application.findMany({
    where: { id: { in: applicationIds } },
    select: { id: true, tenantId: true },
  });
  if (apps.length === 0) return { count: 0 };

  await prisma.application.updateMany({
    where: { id: { in: apps.map((a) => a.id) } },
    data: { status },
  });

  await prisma.auditLog.createMany({
    data: apps.map((a) => ({
      tenantId: a.tenantId,
      actorName: "Admin",
      action: "application.status_changed",
      entityType: "Application",
      entityId: a.id,
      metadataJson: JSON.stringify({ status, bulk: true }),
    })),
  });

  for (const a of apps) revalidatePath(`/applications/${a.id}`);
  invalidateApplicationsViews();
  return { count: apps.length };
}

// recruiterId of null clears the assignment (unassign).
export async function bulkAssignRecruiter(input: { applicationIds: string[]; recruiterId: string | null }) {
  const { applicationIds, recruiterId } = input;
  if (applicationIds.length === 0) return { count: 0 };

  const apps = await prisma.application.findMany({
    where: { id: { in: applicationIds } },
    select: { id: true, tenantId: true },
  });
  if (apps.length === 0) return { count: 0 };

  let recruiterName = "Unassigned";
  if (recruiterId) {
    const recruiter = await prisma.user.findUniqueOrThrow({ where: { id: recruiterId } });
    recruiterName = recruiter.name;
  }

  await prisma.application.updateMany({
    where: { id: { in: apps.map((a) => a.id) } },
    data: { assignedRecruiterId: recruiterId },
  });

  await prisma.auditLog.createMany({
    data: apps.map((a) => ({
      tenantId: a.tenantId,
      actorName: "Admin",
      action: "application.assigned",
      entityType: "Application",
      entityId: a.id,
      metadataJson: JSON.stringify({ recruiterId, recruiterName, bulk: true }),
    })),
  });

  for (const a of apps) revalidatePath(`/applications/${a.id}`);
  invalidateApplicationsViews();
  return { count: apps.length };
}

// Plain text from a textarea -> simple paragraph HTML, shared by the
// single and bulk send paths below.
function textToHtml(bodyText: string) {
  return bodyText
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

// Ad-hoc email to the candidate — separate from the automatic interview
// email, this is for anything else HR wants to tell a candidate (a status
// update, a request for more documents, whatever doesn't fit a fixed
// workflow trigger). Body is plain text from a textarea; converting
// newlines to <br> is enough for a simple message without asking HR to
// write HTML.
export async function sendCandidateEmail(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyText = String(formData.get("body") ?? "").trim();

  if (!subject) throw new Error("Subject is required");
  if (!bodyText) throw new Error("Message is required");

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { candidate: true },
  });

  const result = await sendEmail({
    to: application.candidate.email,
    toName: application.candidate.fullName,
    subject,
    html: textToHtml(bodyText),
  });

  await prisma.auditLog.create({
    data: {
      tenantId: application.tenantId,
      actorName: "Admin",
      action: "email.sent",
      entityType: "Application",
      entityId: applicationId,
      metadataJson: JSON.stringify({ subject, sent: result.sent, error: result.error }),
    },
  });

  if (!result.sent) throw new Error(result.error || "Failed to send email");

  revalidatePath(`/applications/${applicationId}`);
}

// Bulk variant for the Applications list's multi-select toolbar — e.g. ten
// candidates all had interviews scheduled separately and now need the same
// follow-up note, without opening ten application pages one at a time.
// Each candidate still gets their own individual email (never a shared
// to:/cc: list); partial failures don't throw since the caller needs a
// sent/failed count to show, not a single all-or-nothing error.
export async function bulkSendCandidateEmail(input: { applicationIds: string[]; subject: string; body: string }) {
  const subject = input.subject.trim();
  const bodyText = input.body.trim();
  if (!subject) throw new Error("Subject is required");
  if (!bodyText) throw new Error("Message is required");
  if (input.applicationIds.length === 0) return { sent: 0, failed: 0 };

  const apps = await prisma.application.findMany({
    where: { id: { in: input.applicationIds } },
    include: { candidate: true },
  });
  if (apps.length === 0) return { sent: 0, failed: 0 };

  const html = textToHtml(bodyText);
  const results = await Promise.all(
    apps.map(async (application) => ({
      application,
      result: await sendEmail({ to: application.candidate.email, toName: application.candidate.fullName, subject, html }),
    })),
  );

  await prisma.auditLog.createMany({
    data: results.map(({ application, result }) => ({
      tenantId: application.tenantId,
      actorName: "Admin",
      action: "email.sent",
      entityType: "Application",
      entityId: application.id,
      metadataJson: JSON.stringify({ subject, sent: result.sent, error: result.error, bulk: true }),
    })),
  });

  for (const { application } of results) revalidatePath(`/applications/${application.id}`);
  invalidateApplicationsViews();

  const sent = results.filter((r) => r.result.sent).length;
  return { sent, failed: results.length - sent };
}

export async function verifyDocumentAction(formData: FormData) {
  const documentId = String(formData.get("documentId"));
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { verified: true, verifiedBy: "Admin", verifiedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: doc.tenantId,
      actorName: "Admin",
      action: "document.verified",
      entityType: "Document",
      entityId: doc.id,
    },
  });

  revalidatePath(`/applications/${doc.applicationId}`);
  revalidatePath("/dashboard");
}

export async function unverifyDocumentAction(formData: FormData) {
  const documentId = String(formData.get("documentId"));
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { verified: false, verifiedBy: null, verifiedAt: null },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: doc.tenantId,
      actorName: "Admin",
      action: "document.unverified",
      entityType: "Document",
      entityId: doc.id,
    },
  });

  revalidatePath(`/applications/${doc.applicationId}`);
  revalidatePath("/dashboard");
}
