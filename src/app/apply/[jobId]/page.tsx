import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitApplication } from "@/lib/actions/apply";
import { Field, inputClass, Button } from "@/components/ui/primitives";

export default async function ApplyPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      tenant: true,
      department: true,
      form: { include: { sections: { include: { fields: true }, orderBy: { order: "asc" } } } },
    },
  });

  if (!job) notFound();

  const unavailable = job.status !== "published" || !job.form;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{job.tenant.name}</p>
        <h1 className="text-xl font-semibold text-slate-900">{job.title}</h1>
        <p className="text-sm text-slate-500">{job.department?.name}</p>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
        {unavailable ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            This job is not currently accepting applications.
          </div>
        ) : (
          <form action={submitApplication} className="space-y-8">
            <input type="hidden" name="jobId" value={job.id} />
            {job.form!.sections.map((section) => (
              <div key={section.id} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">{section.name}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.id} className={field.fieldType === "textarea" ? "sm:col-span-2" : ""}>
                      <Field label={field.label} htmlFor={field.id} required={field.required} hint={field.helpText ?? undefined}>
                        <DynamicInput field={field} />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button type="submit" className="w-full justify-center">
              Submit Application
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

function DynamicInput({
  field,
}: {
  field: {
    id: string;
    fieldType: string;
    required: boolean;
    optionsJson: string | null;
  };
}) {
  const name = `field__${field.id}`;
  const options: { value: string; label: string }[] = field.optionsJson ? JSON.parse(field.optionsJson) : [];

  switch (field.fieldType) {
    case "textarea":
      return <textarea id={field.id} name={name} required={field.required} rows={3} className={inputClass} />;
    case "select":
      return (
        <select id={field.id} name={name} required={field.required} className={inputClass} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-wrap gap-4 pt-1">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input type="radio" name={name} value={o.value} required={field.required} />
              {o.label}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-1.5 pt-1 text-sm text-slate-700">
          <input type="checkbox" name={name} value="Yes" />
          Yes
        </label>
      );
    case "multiselect":
      return (
        <select id={field.id} name={name} multiple required={field.required} className={`${inputClass} h-auto`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "yes_no":
      return (
        <select id={field.id} name={name} required={field.required} className={inputClass} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      );
    case "number":
      return <input id={field.id} name={name} type="number" step="any" required={field.required} className={inputClass} />;
    case "date":
      return <input id={field.id} name={name} type="date" required={field.required} className={inputClass} />;
    case "email":
      return <input id={field.id} name={name} type="email" required={field.required} className={inputClass} />;
    case "phone":
      return <input id={field.id} name={name} type="tel" required={field.required} className={inputClass} />;
    default:
      return <input id={field.id} name={name} type="text" required={field.required} className={inputClass} />;
  }
}
