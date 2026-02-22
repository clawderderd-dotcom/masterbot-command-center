export function PlaceholderPage(props: { title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {props.description ?? "This page is scaffolded; implementation is next."}
      </p>
      <div className="rounded-lg border bg-white p-4 text-sm dark:bg-slate-950">
        <div className="font-medium">Coming next</div>
        <ul className="mt-2 list-inside list-disc text-slate-600 dark:text-slate-400">
          <li>Gateway connection state + reconnect</li>
          <li>Task CRUD + runs + streaming progress</li>
          <li>Redacted logs + diagnostics</li>
        </ul>
      </div>
    </div>
  );
}
