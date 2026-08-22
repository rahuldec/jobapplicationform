"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const FIELD_PREFIX = "field__";

export async function submitApplication(formData: FormData) {
  const jobId = String(formData.get("jobId"));

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { form: { include: { sections: { include: { fields: true } } } } },
  });

  if (!job.form) throw new Error("This job has no application form configured.");
  if (job.status !== "published") throw new Error("This job is not currently accepting applications.");

  const fields = job.form.sections.flatMap((s) => s.fields);

  // Convention: fields keyed "full_name" / "email" / "mobile" populate the
  // shared Candidate identity record. A tenant can omit any of these; only
  // email is required since it is the tenant-scoped uniqueness key.
  const byKey = new Map(fields.map((f) => [f.fieldKey, formData.get(FIELD_PREFIX + f.id)]));
  const email = String(byKey.get("email") ?? "").trim();
  if (!email) throw new Error("An email field is required on the application form to identify candidates.");

  const fullName = String(byKey.get("full_name") ?? "Unnamed Candidate").trim();
  const mobile = byKey.get("mobile") ? String(byKey.get("mobile")).trim() : null;

  const candidate = await prisma.candidate.upsert({
    where: { tenantId_email: { tenantId: job.tenantId, email } },
    update: { fullName, mobile },
    create: { tenantId: job.tenantId, fullName, email, mobile },
  });

  const applicationCount = await prisma.application.count({ where: { tenantId: job.tenantId } });
  const year = new Date().getFullYear();
  const applicationNumber = `APP-${year}-${String(applicationCount + 1).padStart(4, "0")}`;

  const application = await prisma.application.create({
    data: {
      tenantId: job.tenantId,
      jobId: job.id,
      candidateId: candidate.id,
      applicationNumber,
      status: "submitted",
      submittedAt: new Date(),
    },
  });

  for (const field of fields) {
    const raw = formData.get(FIELD_PREFIX + field.id);
    if (raw === null || raw === "") continue;
    const text = String(raw);
    const numeric = field.fieldType === "number" ? Number(text) : null;
    await prisma.applicationFieldValue.create({
      data: {
        applicationId: application.id,
        fieldId: field.id,
        valueText: text,
        valueNumber: numeric !== null && !Number.isNaN(numeric) ? numeric : null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: job.tenantId,
      actorName: fullName,
      action: "application.submitted",
      entityType: "Application",
      entityId: application.id,
    },
  });

  redirect(`/apply/${job.id}/submitted?number=${applicationNumber}`);
}
