import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Task } from "@mcc/shared";
import { apiCreateTask, apiListTasks, apiStartTask } from "../lib/api";
import { useDashboard } from "../state/DashboardContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

function statusColor(status: Task["status"]) {
  switch (status) {
    case "Running":
      return "bg-emerald-500";
    case "Queued":
      return "bg-sky-500";
    case "Blocked":
      return "bg-red-500";
    case "NeedsInput":
      return "bg-amber-500";
    case "Done":
      return "bg-slate-400";
    default:
      return "bg-slate-300";
  }
}

export function TasksPage() {
  const dash = useDashboard();
  const [search] = useSearchParams();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(search.get("new") === "1");
  const [mode, setMode] = React.useState<"quick" | "advanced">("quick");
  const [quickText, setQuickText] = React.useState("");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [desiredOutcome, setDesiredOutcome] = React.useState("");

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiListTasks();
      setTasks(res.tasks);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dash.bump]);

  async function create() {
    setErr(null);
    try {
      const body =
        mode === "quick"
          ? { mode: "quick", quickText }
          : { mode: "advanced", title, description, desiredOutcome };
      const res = await apiCreateTask(body);
      setOpen(false);
      setQuickText("");
      setTitle("");
      setDescription("");
      setDesiredOutcome("");
      await refresh();
      // Optional: auto-start draft tasks quickly
      await apiStartTask(res.task.id);
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">Tasks</div>
          <div className="text-sm text-slate-500">Create, start, and monitor task runs.</div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create task</DialogTitle>
              <DialogDescription>Quick create (1–2 sentences) or fill out the advanced form.</DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Button variant={mode === "quick" ? "default" : "outline"} size="sm" onClick={() => setMode("quick")}>
                Quick
              </Button>
              <Button
                variant={mode === "advanced" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("advanced")}
              >
                Advanced
              </Button>
            </div>

            {mode === "quick" ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">Describe the task. We’ll structure it automatically.</div>
                <Textarea
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="Example: Implement WS reconnect handling and add a Tasks list view."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">Description</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs text-slate-500">Desired outcome</label>
                  <Textarea value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} />
                </div>
              </div>
            )}

            {err ? <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div> : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={mode === "quick" ? !quickText.trim() : !title.trim()}>
                Create & start
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All tasks</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${tasks.length} task(s)`} • Gateway: {dash.gatewayConnected ? "connected" : "disconnected"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr className="border-b dark:border-slate-800">
                  <th className="py-2">Status</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Session</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b align-top dark:border-slate-800">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusColor(t.status)}`} />
                        <span className="text-xs">{t.status}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="font-medium">
                        <Link className="hover:underline" to={`/tasks/${t.id}`}>
                          {t.title}
                        </Link>
                      </div>
                      {t.tags.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 text-xs">{t.priority}</td>
                    <td className="py-2 text-xs text-slate-500">{t.sessionKey ?? "—"}</td>
                    <td className="py-2 text-xs text-slate-500">{new Date(t.updatedAt).toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await apiStartTask(t.id);
                          await refresh();
                        }}
                        disabled={!dash.gatewayConnected && t.status !== "Draft"}
                      >
                        Start
                      </Button>
                    </td>
                  </tr>
                ))}
                {!tasks.length && !loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                      No tasks yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
