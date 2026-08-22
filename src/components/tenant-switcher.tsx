"use client";

import { useRef, useTransition } from "react";
import { switchTenant } from "@/lib/actions/tenant";

export function TenantSwitcher({
  tenants,
  currentTenantId,
}: {
  tenants: { id: string; name: string }[];
  currentTenantId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={switchTenant} className="flex items-center gap-2">
      <select
        name="tenantId"
        defaultValue={currentTenantId}
        disabled={pending}
        onChange={() => startTransition(() => formRef.current?.requestSubmit())}
        className="rounded-md border-0 bg-slate-800 px-2.5 py-1.5 text-sm text-white ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-indigo-500"
        aria-label="Switch college"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </form>
  );
}
