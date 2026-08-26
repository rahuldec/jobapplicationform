"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/enums";

// Staff records (recruiters, panel members) are plain Users scoped to a
// tenant — no login/auth exists yet, so these rows exist purely so other
// features (bulk-assign a recruiter, an interview panel) have real names
// to pick from instead of free text. Creating one here does not grant
// that person any access to the app.
export async function createStaffUser(formData: FormData) {
  const tenantId = String(formData.get("tenantId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "recruiter");

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!ROLES.includes(role as never)) throw new Error("Invalid role");

  await prisma.user.create({ data: { tenantId, name, email, role } });

  revalidatePath(`/admin/${tenantId}`);
}

export async function deleteStaffUser(formData: FormData) {
  const userId = String(formData.get("userId"));
  const tenantId = String(formData.get("tenantId"));

  // Unassign rather than block: a recruiter can be removed from staff
  // without silently orphaning the applications they were assigned to.
  await prisma.application.updateMany({ where: { assignedRecruiterId: userId }, data: { assignedRecruiterId: null } });
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath(`/admin/${tenantId}`);
  revalidatePath("/applications");
}
