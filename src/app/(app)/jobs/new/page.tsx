import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { createJob } from "@/lib/actions/jobs";
import { Card, CardHeader, Field, inputClass, Button } from "@/components/ui/primitives";

export default async function NewJobPage() {
  const tenant = await getCurrentTenant();

  const [departments, forms] = await Promise.all([
    prisma.department.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
    prisma.applicationForm.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">New Job</h1>
        <p className="text-sm text-slate-500">Create a job posting for {tenant.name}.</p>
      </div>

      <Card>
        <CardHeader title="Job details" />
        <form action={createJob} className="space-y-4 px-5 py-5">
          <Field label="Job title" htmlFor="title" required>
            <input id="title" name="title" required className={inputClass} placeholder="Assistant Professor — Physics" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Job code" htmlFor="code">
              <input id="code" name="code" className={inputClass} placeholder="e.g. NBGSM-PHY-01" />
            </Field>
            <Field label="Number of positions" htmlFor="numberOfPositions">
              <input
                id="numberOfPositions"
                name="numberOfPositions"
                type="number"
                min={1}
                defaultValue={1}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Employment type" htmlFor="employmentType">
            <input
              id="employmentType"
              name="employmentType"
              className={inputClass}
              placeholder="e.g. Assistant Professor — Regular"
            />
          </Field>

          <Field label="Department" htmlFor="departmentId">
            <select id="departmentId" name="departmentId" className={inputClass}>
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Application form"
            htmlFor="formId"
            hint={forms.length === 0 ? "No application forms configured yet for this tenant." : undefined}
          >
            <select id="formId" name="formId" className={inputClass}>
              <option value="">— None —</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description" htmlFor="description">
            <textarea id="description" name="description" rows={3} className={inputClass} />
          </Field>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="submit">Create Job</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
