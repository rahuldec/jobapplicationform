"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { INTERVIEW_MODES } from "@/lib/enums";

function invalidateApplicationViews(applicationId: string) {
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

// One form covers both scheduling and rescheduling: if this application
// already has an interview in "scheduled" state, this updates it (and
// logs a reschedule) instead of creating a second one — an application
// only ever has one upcoming interview at a time, even though the table
// keeps history rather than overwriting past rows.
export async function scheduleInterview(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes") ?? 30) || 30;
  const mode = String(formData.get("mode") ?? "in_person");
  const location = String(formData.get("location") ?? "").trim() || null;
  const panelistNames = String(formData.get("panelistNames") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!scheduledAtRaw) throw new Error("Interview date/time is required");
  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid interview date/time");
  if (!INTERVIEW_MODES.includes(mode as never)) throw new Error("Invalid interview mode");

  const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  const existing = await prisma.interview.findFirst({
    where: { applicationId, status: "scheduled" },
    orderBy: { scheduledAt: "desc" },
  });

  const data = { scheduledAt, durationMinutes, mode, location, panelistNames, notes };
  const interview = existing
    ? await prisma.interview.update({ where: { id: existing.id }, data })
    : await prisma.interview.create({ data: { tenantId: application.tenantId, applicationId, status: "scheduled", ...data } });

  await prisma.application.update({ where: { id: applicationId }, data: { status: "interview_scheduled" } });

  await prisma.auditLog.create({
    data: {
      tenantId: application.tenantId,
      actorName: "Admin",
      action: existing ? "interview.rescheduled" : "interview.scheduled",
      entityType: "Application",
      entityId: applicationId,
      metadataJson: JSON.stringify({ interviewId: interview.id, scheduledAt }),
    },
  });

  invalidateApplicationViews(applicationId);
}

export async function markInterviewCompleted(formData: FormData) {
  const interviewId = String(formData.get("interviewId"));
  const interview = await prisma.interview.update({ where: { id: interviewId }, data: { status: "completed" } });
  await prisma.application.update({ where: { id: interview.applicationId }, data: { status: "interviewed" } });

  await prisma.auditLog.create({
    data: {
      tenantId: interview.tenantId,
      actorName: "Admin",
      action: "interview.completed",
      entityType: "Application",
      entityId: interview.applicationId,
      metadataJson: JSON.stringify({ interviewId: interview.id }),
    },
  });

  invalidateApplicationViews(interview.applicationId);
}

export async function cancelInterview(formData: FormData) {
  const interviewId = String(formData.get("interviewId"));
  const interview = await prisma.interview.update({ where: { id: interviewId }, data: { status: "cancelled" } });

  await prisma.auditLog.create({
    data: {
      tenantId: interview.tenantId,
      actorName: "Admin",
      action: "interview.cancelled",
      entityType: "Application",
      entityId: interview.applicationId,
      metadataJson: JSON.stringify({ interviewId: interview.id }),
    },
  });

  invalidateApplicationViews(interview.applicationId);
}
