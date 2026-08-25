"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { JOB_STATUSES, type JobStatus } from "@/lib/enums";

export async function createJob(formData: FormData) {
  const tenant = await getCurrentTenant();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Job title is required");

  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const formId = String(formData.get("formId") ?? "") || null;
  const employmentType = String(formData.get("employmentType") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const numberOfPositions = Number(formData.get("numberOfPositions") ?? 1) || 1;
  const code = String(formData.get("code") ?? "").trim() || null;

  const job = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      title,
      code,
      description,
      employmentType,
      numberOfPositions,
      departmentId,
      formId,
      status: "draft",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorName: "Admin",
      action: "job.created",
      entityType: "Job",
      entityId: job.id,
    },
  });

  redirect(`/jobs/${job.id}`);
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  if (!JOB_STATUSES.includes(status)) throw new Error("Invalid job status");

  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      publishedAt: status === "published" ? new Date() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: job.tenantId,
      actorName: "Admin",
      action: status === "published" ? "job.published" : status === "closed" ? "job.closed" : "job.created",
      entityType: "Job",
      entityId: job.id,
    },
  });

  revalidatePath(`/jobs/${job.id}`);
  revalidatePath("/jobs");
}

export async function updateJobDeadlineAction(formData: FormData) {
  const jobId = String(formData.get("jobId"));
  const raw = String(formData.get("applicationDeadline") ?? "").trim();
  const applicationDeadline = raw ? new Date(raw) : null;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { applicationDeadline },
  });

  revalidatePath(`/jobs/${job.id}`);
  revalidatePath("/jobs");
}

export async function publishJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId"));
  await updateJobStatus(jobId, "published");
}

export async function closeJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId"));
  await updateJobStatus(jobId, "closed");
}
