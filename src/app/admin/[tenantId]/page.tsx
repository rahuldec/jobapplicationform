import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTenantBranding, updateInterviewEmailTemplate, updateSynopsisEmbedDocuments } from "@/lib/actions/tenants";
import { createStaffUser, deleteStaffUser } from "@/lib/actions/staff";
import { getTenantBranding } from "@/lib/branding";
import { CollapsibleCard, Field, inputClass, Button, Badge, EmptyState, PlaceholderChips, OverviewCard, OverviewSubTile } from "@/components/ui/primitives";
import { SheetConfigBuilder } from "@/components/admin/sheet-config-builder";
import { SynopsisTemplateEditor } from "@/components/admin/synopsis-template-editor";
import { ColorPickerField } from "@/components/admin/color-picker-field";
import { ROLE_LABELS, STAFF_CREATABLE_ROLES } from "@/lib/enums";
import { DEFAULT_INTERVIEW_EMAIL_SUBJECT, DEFAULT_INTERVIEW_EMAIL_BODY, INTERVIEW_EMAIL_PLACEHOLDERS } from "@/lib/email";
import { formatDateTime } from "@/lib/date";
import { parseSheetImportConfig } from "../../../../prisma/sheet-import/types";

export default async function AdminTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) notFound();

  const branding = getTenantBranding(tenant);
  const [staff, totalApplications, totalJobs, lastLogin] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
    prisma.application.count({ where: { tenantId: tenant.id } }),
    prisma.job.count({ where: { tenantId: tenant.id } }),
    prisma.auditLog.findFirst({ where: { tenantId: tenant.id, action: "tenant.login" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const applicationForm = await prisma.applicationForm.findFirst({
    where: { tenantId: tenant.id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { fields: { orderBy: { order: "asc" } } },
      },
    },
  });
  const formFieldOptions = (applicationForm?.sections ?? []).flatMap((s) =>
    s.fields.map((f) => ({ id: f.id, label: f.label, sectionName: s.name }))
  );

  let initialConfig = null;
  if (tenant.sheetMappingJson) {
    try {
      initialConfig = parseSheetImportConfig(tenant.sheetMappingJson);
    } catch {
      // Malformed/partial config — the builder just starts from empty.
    }
  }

  const navSections = [
    { id: "overview", label: "Overview" },
    { id: "manual", label: "User manual" },
    { id: "branding", label: "Branding" },
    { id: "staff", label: "Staff" },
    { id: "interview-email", label: "Interview email" },
    { id: "sheet-sync", label: "Sheet sync" },
    { id: "synopsis", label: "Synopsis" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      {/* Page header */}
      <div className="flex items-center gap-2 py-6 text-[13px]">
        <Link href="/admin" className="font-medium text-slate-400 hover:text-slate-700 transition-colors">
          All clients
        </Link>
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-slate-300">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold text-slate-800">{tenant.name}</span>
      </div>

      <div className="flex gap-10 items-start">
        {/* Sticky sidebar nav */}
        <aside className="hidden lg:block w-44 shrink-0">
          <div className="sticky top-8 space-y-1">
            <div className="mb-4 pb-4 border-b border-slate-100">
              <p className="text-[13px] font-bold text-slate-900 truncate">{tenant.name}</p>
              <code className="text-[11px] text-slate-400">/{tenant.slug}</code>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 pb-1 pt-1">Sections</p>
            {navSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-orange-50 hover:text-orange-700"
              >
                {s.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Overview */}
          <section id="overview">
            <OverviewCard
              title={tenant.name}
              badgeLabel={lastLogin ? `Last login ${formatDateTime(lastLogin.createdAt)}` : "Never logged in"}
              badgeTone={lastLogin ? "green" : "slate"}
            >
              <OverviewSubTile label="Staff accounts" value={staff.length} color="#64748b" />
              <OverviewSubTile label="Total applications" value={totalApplications} color="#3b82f6" href={`/admin/activity?tenantId=${tenant.id}`} />
              <OverviewSubTile label="Jobs posted" value={totalJobs} color="#8b5cf6" />
              <OverviewSubTile label="Activity log" value="View all →" color="#10b981" href={`/admin/activity?tenantId=${tenant.id}`} />
            </OverviewCard>
          </section>

      <CollapsibleCard
        id="manual"
        sectionNumber="00"
        icon={
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-orange-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        }
        title="User manual"
        description="A step-by-step guide to every section below — branding, staff, interview email, and Sheet sync."
      >
        <div className="flex items-center justify-between gap-4 px-5 py-5">
          <p className="text-sm text-slate-600">
            Written for anyone setting up or updating a client, no coding knowledge required. Opens in a new tab so you
            can keep it open alongside this page.
          </p>
          <Link
            href="/manual"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-orange-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1"
          >
            Open manual
          </Link>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="branding"
        icon={
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-orange-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 13.5 9 15.75m-3-3 1.5 1.5m6.75-9.75-3.75 3.75m-4.5 4.5L9.75 9m6-6.75 3 3-9.75 9.75-4.5-4.5L14.25 2.25Z" />
          </svg>
        }
        title="Branding"
        description="Shown in the nav bar and on the synopsis PDF header."
      >
        <form action={updateTenantBranding} encType="multipart/form-data" className="space-y-4 px-5 py-5">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full display name" htmlFor="name">
              <input id="name" name="name" defaultValue={branding.name} className={inputClass} />
            </Field>
            <Field label="Short name (mobile nav)" htmlFor="shortName">
              <input id="shortName" name="shortName" defaultValue={branding.shortName} className={inputClass} />
            </Field>
          </div>
          <Field label="Tagline" htmlFor="tagline" hint="Shown as one line under the name in the nav header. Leave blank for none.">
            <input
              id="tagline"
              name="tagline"
              defaultValue={branding.tagline ?? ""}
              className={inputClass}
              placeholder="e.g. Excellence in Education Since 1956"
            />
          </Field>
          <Field label="Logo" htmlFor="logo" hint="PNG or JPEG. Leave blank to keep the current logo.">
            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ColorPickerField name="gradientFrom" label="Gradient — from" defaultValue={branding.gradient.from} />
            <ColorPickerField name="gradientVia" label="Gradient — via" defaultValue={branding.gradient.via} />
            <ColorPickerField name="gradientTo" label="Gradient — to" defaultValue={branding.gradient.to} />
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button type="submit">Save branding</Button>
          </div>
        </form>
      </CollapsibleCard>

      <CollapsibleCard
        id="staff"
        icon={
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-orange-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        }
        title="Staff"
        description="Recruiters and panel members — shown in the bulk-assign dropdown on Applications. Creating one here doesn't grant them any login access, since none exists yet."
      >
        {staff.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No staff added yet" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {staff.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-slate-800">{u.name}</span>
                  <span className="text-xs text-slate-400">{u.email}</span>
                  <Badge tone={u.role === "recruiter" ? "blue" : u.role === "panel_member" ? "purple" : "slate"}>
                    {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                  </Badge>
                </div>
                <form action={deleteStaffUser}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={createStaffUser} className="grid grid-cols-1 gap-3 border-t border-slate-100 px-5 py-5 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <Field label="Name" htmlFor="staffName">
            <input id="staffName" name="name" required className={inputClass} placeholder="Dr. A Sharma" />
          </Field>
          <Field label="Email" htmlFor="staffEmail">
            <input id="staffEmail" name="email" type="email" required className={inputClass} placeholder="a.sharma@example.com" />
          </Field>
          <Field label="Role" htmlFor="staffRole">
            <select id="staffRole" name="role" defaultValue="recruiter" className={inputClass}>
              {STAFF_CREATABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit">Add</Button>
          </div>
        </form>
      </CollapsibleCard>

      <CollapsibleCard
        id="interview-email"
        icon={
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-orange-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        }
        title="Interview email"
        description="Sent to the candidate automatically when an interview is scheduled or rescheduled. Leave blank to use the default wording below."
      >
        <form action={updateInterviewEmailTemplate} className="space-y-4 px-5 py-5">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <Field
            label="Subject"
            htmlFor="interviewEmailSubject"
            hint={<PlaceholderChips names={INTERVIEW_EMAIL_PLACEHOLDERS} />}
          >
            <input
              id="interviewEmailSubject"
              name="interviewEmailSubject"
              defaultValue={tenant.interviewEmailSubject ?? ""}
              placeholder={DEFAULT_INTERVIEW_EMAIL_SUBJECT}
              className={inputClass}
            />
          </Field>
          <Field label="Body (HTML)" htmlFor="interviewEmailBody">
            <textarea
              id="interviewEmailBody"
              name="interviewEmailBody"
              rows={8}
              defaultValue={tenant.interviewEmailBody ?? ""}
              placeholder={DEFAULT_INTERVIEW_EMAIL_BODY}
              className={`${inputClass} resize-y font-mono text-xs`}
            />
          </Field>
          <Field label="CC" htmlFor="interviewEmailCc" hint="Optional — comma-separated addresses always cc'd on this email, e.g. hr@college.edu">
            <input
              id="interviewEmailCc"
              name="interviewEmailCc"
              defaultValue={tenant.interviewEmailCc ?? ""}
              placeholder="hr@college.edu, dept@college.edu"
              className={inputClass}
            />
          </Field>
          <Field label="BCC" htmlFor="interviewEmailBcc" hint="Optional — comma-separated addresses always bcc'd on this email, invisible to the candidate and other recipients">
            <input
              id="interviewEmailBcc"
              name="interviewEmailBcc"
              defaultValue={tenant.interviewEmailBcc ?? ""}
              placeholder="records@college.edu"
              className={inputClass}
            />
          </Field>
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button type="submit">Save Template</Button>
          </div>
        </form>
      </CollapsibleCard>

      <CollapsibleCard
        id="sheet-sync"
        icon={
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-orange-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m2.25-3.75h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5" />
          </svg>
        }
        title="Sheet sync"
        description="Maps this client's Google Sheet columns onto the application form. Existing data is never rewritten by saving here — only future syncs use the updated mapping. Set this up before Synopsis Template below, since its field reference depends on the form fields this creates."
      >
        <div className="space-y-5 p-5">
          <SheetConfigBuilder
            tenantId={tenant.id}
            tenantName={tenant.name}
            initialSheetSourceUrl={tenant.sheetSourceUrl ?? ""}
            initialConfig={initialConfig}
          />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="synopsis"
        icon={
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-orange-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        }
        title="Synopsis Template"
        description="Customize the PDF template with HTML/CSS. Leave empty to use the built-in default. Use {{variable}} syntax to insert candidate data."
      >
        <form action={updateSynopsisEmbedDocuments} className="px-5 py-5 border-b border-slate-100 space-y-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <h3 className="text-sm font-semibold text-slate-900">Add Uploaded Documents</h3>
          <p className="text-sm text-slate-600">
            Choose whether to include the candidate&apos;s uploaded documents (certificates, ID proofs, etc.) in the
            Synopsis PDF.
          </p>
          <p className="text-sm text-slate-600">
            <strong>Default template:</strong> Photograph and Signature are always included in the header/declaration automatically.
          </p>
          <p className="text-sm text-slate-600">
            <strong>Custom HTML template:</strong> Photograph and Signature only appear if your template uses{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">{"{{photoUrl}}"}</code> and{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">{"{{signatureImageUrl}}"}</code> — you control where they go.
          </p>
          <p className="text-sm text-slate-600">This option controls other documents uploaded by the candidate (certificates, ID proofs, etc.).</p>
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              name="synopsisEmbedDocuments"
              defaultChecked={tenant.synopsisEmbedDocuments}
              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            Include uploaded documents in the Synopsis PDF
          </label>
          <div className="flex justify-end">
            <Button type="submit" size="sm">Save</Button>
          </div>
        </form>
        <SynopsisTemplateEditor
          tenantId={tenant.id}
          initialTemplate={tenant.synopsisTemplateHtml}
          formFields={formFieldOptions}
        />
      </CollapsibleCard>
        </div>{/* end main content */}
      </div>{/* end two-column flex */}
    </div>
  );
}
