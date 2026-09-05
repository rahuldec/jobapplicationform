import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTenantBranding, updateInterviewEmailTemplate } from "@/lib/actions/tenants";
import { createStaffUser, deleteStaffUser } from "@/lib/actions/staff";
import { getTenantBranding } from "@/lib/branding";
import { CollapsibleCard, Field, inputClass, Button, Badge, EmptyState, PlaceholderChips } from "@/components/ui/primitives";
import { SheetConfigBuilder } from "@/components/admin/sheet-config-builder";
import { SynopsisConfigBuilder } from "@/components/admin/synopsis-config-builder";
import { SynopsisTemplateEditor } from "@/components/admin/synopsis-template-editor";
import { SynopsisVisualBuilderV2 } from "@/components/admin/synopsis-visual-builder-v2";
import { ColorPickerField } from "@/components/admin/color-picker-field";
import { ROLE_LABELS, STAFF_CREATABLE_ROLES } from "@/lib/enums";
import { DEFAULT_INTERVIEW_EMAIL_SUBJECT, DEFAULT_INTERVIEW_EMAIL_BODY, INTERVIEW_EMAIL_PLACEHOLDERS } from "@/lib/email";
import { parseSynopsisConfig } from "@/lib/synopsis-config";
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
  const staff = await prisma.user.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } });
  const applicationForm = await prisma.applicationForm.findFirst({
    where: { tenantId: tenant.id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { fields: { orderBy: { order: "asc" } } },
      },
    },
  });
  const synopsisConfig = parseSynopsisConfig(tenant.synopsisConfigJson);

  const builderFormFields = (applicationForm?.sections ?? []).flatMap((s) =>
    s.fields.map((f) => ({ id: f.id, label: f.label, sectionName: s.name }))
  );

  let builderConfig = null;
  if (tenant.synopsisTemplateBuilderConfig) {
    try {
      builderConfig = JSON.parse(tenant.synopsisTemplateBuilderConfig);
    } catch {
      // Malformed config — the builder starts from empty
    }
  }

  let initialConfig = null;
  if (tenant.sheetMappingJson) {
    try {
      initialConfig = parseSheetImportConfig(tenant.sheetMappingJson);
    } catch {
      // Malformed/partial config — the builder just starts from empty.
    }
  }

  return (
    <>
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin" className="text-xs font-medium text-slate-500 hover:text-slate-800">
        ← All clients
      </Link>
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{tenant.name}</h1>
        <p className="text-sm text-slate-500">
          Entry link: <code className="text-slate-700">/{tenant.slug}</code> — visiting it sets this browser to this client.
        </p>
      </div>

      <CollapsibleCard title="User manual" description="A step-by-step guide to every section below — branding, staff, interview email, and Sheet sync.">
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

      <CollapsibleCard title="Branding" description="Shown in the nav bar and on the synopsis PDF header.">
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
        title="Synopsis"
        description="Which sections appear on this client's synopsis PDF, and in what order — the single download, the bulk ZIP, and the Docs export all use the same setup. Use the arrows to reorder; leave everything checked to include the full report."
      >
        <SynopsisConfigBuilder
          tenantId={tenant.id}
          initialConfig={synopsisConfig}
          sections={applicationForm?.sections.map((s) => ({ id: s.id, name: s.name })) ?? []}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="Synopsis Template"
        description="Customize the PDF template with HTML/CSS. Leave empty to use the built-in default. Use {{variable}} syntax to insert candidate data."
      >
        <SynopsisTemplateEditor
          tenantId={tenant.id}
          initialTemplate={tenant.synopsisTemplateHtml}
          formFields={builderFormFields}
        />
      </CollapsibleCard>
    </div>

    <div className="mx-auto max-w-6xl mt-5">
      <CollapsibleCard
        title="Visual Template Builder"
        description="Design your PDF template visually by dragging and dropping elements. No HTML knowledge required."
      >
        <SynopsisVisualBuilderV2 tenantId={tenant.id} initialConfig={builderConfig} formFields={builderFormFields} />
      </CollapsibleCard>
    </div>

    <div className="mx-auto max-w-3xl space-y-5 mt-5">
      <CollapsibleCard
        title="Sheet sync"
        description="Maps this client's Google Sheet columns onto the application form. Existing data is never rewritten by saving here — only future syncs use the updated mapping."
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
    </div>
    </>
  );
}
