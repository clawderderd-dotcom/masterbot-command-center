import * as React from "react";
import { useParams } from "react-router-dom";
import { apiAskUpdate, apiCancelTask, apiGetTask, apiSendMessage, apiStartTask } from "../lib/api";
import { useDashboard } from "../state/DashboardContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";

export function TaskDetailPage() {
  const { taskId } = useParams();
  const dash = useDashboard();

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");

  async function refresh() {
    if (!taskId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await apiGetTask(taskId);
      setData(res);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, dash.bump]);

  if (!taskId) return <div className="text-sm text-slate-500">Missing task id.</div>;

  const task = data?.task;
  const latestRun = data?.latestRun;
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{task?.title ?? "Task"}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>ID: {taskId}</span>
            {task?.status ? <Badge>{task.status}</Badge> : null}
            {task?.priority ? <Badge>{task.priority}</Badge> : null}
            {task?.sessionKey ? <Badge>Session: {task.sessionKey}</Badge> : <Badge>No session</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await apiStartTask(taskId);
              await refresh();
            }}
          >
            Start
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await apiAskUpdate(taskId);
            }}
            disabled={!dash.gatewayConnected}
          >
            Ask for update
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await apiCancelTask(taskId);
              await refresh();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>

      {err ? <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>{loading ? "Loading…" : "Task details"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-slate-500">Description</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{task?.description ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Desired outcome</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{task?.desiredOutcome ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Acceptance criteria</div>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {(task?.acceptanceCriteria ?? []).map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
                {task?.acceptanceCriteria?.length ? null : <li className="text-slate-500">—</li>}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live progress</CardTitle>
            <CardDescription>
              Run: {latestRun ? `#${latestRun.number} (${latestRun.status})` : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              {logs.map((l: any, i: number) => (
                <div key={i} className="mb-2">
                  <div className="text-[10px] text-slate-500">{new Date(l.ts).toLocaleTimeString()}</div>
                  <div className="whitespace-pre-wrap">{l.message}</div>
                </div>
              ))}
              {!logs.length ? <div className="text-slate-500">No logs yet.</div> : null}
            </div>

            <div className="mt-3 grid gap-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message to the task session…" />
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    const msg = text;
                    setText("");
                    await apiSendMessage(taskId, msg);
                  }}
                  disabled={!text.trim() || !dash.gatewayConnected}
                >
                  Send
                </Button>
              </div>
              {!dash.gatewayConnected ? (
                <div className="text-xs text-amber-600">Gateway is disconnected; messages may fail.</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
