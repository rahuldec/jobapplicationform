import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTenantBranding } from "@/lib/actions/tenants";
import { getTenantBranding } from "@/lib/branding";
import { Card, CardHeader, Field, inputClass, Button } from "@/components/ui/primitives";
import { SheetConfigBuilder } from "@/components/admin/sheet-config-builder";
import { ColorPickerField } from "@/components/admin/color-picker-field";
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

  let initialConfig = null;
  if (tenant.sheetMappingJson) {
    try {
      initialConfig = parseSheetImportConfig(tenant.sheetMappingJson);
    } catch {
      // Malformed/partial config — the builder just starts from empty.
    }
  }

  return (
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

      <Card>
        <CardHeader title="Branding" description="Shown in the nav bar and on the synopsis PDF header." />
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
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">Sheet sync</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Maps this client&apos;s Google Sheet columns onto the application form. Existing data is never rewritten by
          saving here — only future syncs use the updated mapping.
        </p>
      </div>
      <SheetConfigBuilder
        tenantId={tenant.id}
        tenantName={tenant.name}
        initialSheetSourceUrl={tenant.sheetSourceUrl ?? ""}
        initialConfig={initialConfig}
      />
    </div>
  );
}
