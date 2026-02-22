import { useParams } from "react-router-dom";

export function TaskDetailPage() {
  const { taskId } = useParams();
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Task {taskId}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Placeholder: summary, acceptance criteria checklist, live progress stream, task chat, artifacts,
        run history, and controls.
      </p>
      <div className="rounded-lg border p-4 text-sm">
        Implement after server + gateway client are wired.
      </div>
    </div>
  );
}
