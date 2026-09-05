import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SynopsisVisualBuilder } from "@/components/admin/synopsis-visual-builder";

export default async function VisualBuilderPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) notFound();

  let builderConfig = null;
  if (tenant.synopsisTemplateBuilderConfig) {
    try {
      builderConfig = JSON.parse(tenant.synopsisTemplateBuilderConfig);
    } catch {
      // Malformed config
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-600">Visual Template Builder</p>
        </div>
        <SynopsisVisualBuilder tenantId={tenant.id} initialConfig={builderConfig} />
      </div>
    </div>
  );
}
