export default async function ApplicationSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const { number } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          ✓
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Application submitted</h1>
        <p className="mt-2 text-sm text-slate-500">
          Thank you for applying. Please keep your application number for reference.
        </p>
        {number ? (
          <p className="mt-4 rounded-md bg-slate-50 px-4 py-2 font-mono text-sm text-slate-800 ring-1 ring-slate-200">
            {number}
          </p>
        ) : null}
      </div>
    </div>
  );
}
