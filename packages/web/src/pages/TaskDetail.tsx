import * as React from "react";
import { useParams } from "react-router-dom";
import type { Run } from "@mcc/shared";
import { Ban, CirclePlay, Copy, MessageSquarePlus, RefreshCw } from "lucide-react";

import { apiAskUpdate, apiCancelTask, apiGetTask, apiSendMessage, apiStartTask } from "../lib/api";
import { useDashboard } from "../state/DashboardContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../lib/utils";
import { useToast } from "../components/ui/use-toast";

function LogLine({ ts, message }: { ts: string; message: string }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] text-muted-foreground">{new Date(ts).toLocaleTimeString()}</div>
      <div className="whitespace-pre-wrap leading-relaxed">{message}</div>
    </div>
  );
}

export function TaskDetailPage() {
  const { taskId } = useParams();
  const dash = useDashboard();
  const { toast } = useToast();

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

  if (!taskId) return <div className="text-sm text-muted-foreground">Missing task id.</div>;

  const task = data?.task;
  const latestRun: Run | null = data?.latestRun ?? null;
  const runs: Run[] = data?.runs ?? [];
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{task?.title ?? (loading ? "Loading…" : "Task")}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border border-border/70 bg-card px-2 py-1">ID: {taskId}</span>
            {task?.status ? <Badge>{task.status}</Badge> : null}
            {task?.priority ? <Badge>{task.priority}</Badge> : null}
            {task?.sessionKey ? <Badge>Session: {task.sessionKey}</Badge> : <Badge>No session</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await apiStartTask(taskId);
              toast({ title: "Task started" });
              await refresh();
            }}
          >
            <CirclePlay className="size-4" />
            Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await apiAskUpdate(taskId);
              toast({ title: "Update requested" });
            }}
            disabled={!dash.gatewayConnected}
          >
            <MessageSquarePlus className="size-4" />
            Ask for update
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await apiCancelTask(taskId);
              toast({ title: "Task cancelled" });
              await refresh();
            }}
          >
            <Ban className="size-4" />
            Cancel
          </Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>{loading ? "Loading…" : "Task details"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{task?.description ?? (loading ? "" : "—")}</div>
                  {loading ? <Skeleton className="mt-2 h-3 w-4/5" /> : null}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Desired outcome</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{task?.desiredOutcome ?? (loading ? "" : "—")}</div>
                  {loading ? <Skeleton className="mt-2 h-3 w-3/5" /> : null}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Acceptance criteria</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {(task?.acceptanceCriteria ?? []).map((x: string, i: number) => (
                      <li key={i}>{x}</li>
                    ))}
                    {task?.acceptanceCriteria?.length ? null : <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Latest run</CardTitle>
                <CardDescription>
                  {latestRun ? `#${latestRun.number} • ${latestRun.status}` : loading ? "Loading…" : "No runs yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">Recent logs</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const text = logs.map((l: any) => `[${l.ts}] ${l.message}`).join("\n");
                      await navigator.clipboard.writeText(text);
                      toast({ title: "Copied", description: "Logs copied to clipboard" });
                    }}
                    disabled={!logs.length}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </div>

                <div className="mt-2 h-[320px] overflow-auto rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
                  {logs.map((l: any, i: number) => (
                    <LogLine key={i} ts={l.ts} message={l.message} />
                  ))}
                  {!logs.length && !loading ? <div className="text-muted-foreground">No logs yet.</div> : null}
                  {loading && !logs.length ? (
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    Back to top
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>Live session log stream (most recent first in the run).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[520px] overflow-auto rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
                {logs.map((l: any, i: number) => (
                  <LogLine key={i} ts={l.ts} message={l.message} />
                ))}
                {!logs.length && !loading ? <div className="text-muted-foreground">No logs yet.</div> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat</CardTitle>
              <CardDescription>Send a message to the task session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message…" />
              <div className="flex items-center justify-between gap-3">
                {!dash.gatewayConnected ? (
                  <div className="text-xs text-warning">Gateway is disconnected; messages may fail.</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Tip: include concrete acceptance criteria.</div>
                )}

                <Button
                  onClick={async () => {
                    const msg = text.trim();
                    if (!msg) return;
                    setText("");
                    await apiSendMessage(taskId, msg);
                    toast({ title: "Message sent" });
                  }}
                  disabled={!text.trim() || !dash.gatewayConnected}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>Runs</CardTitle>
              <CardDescription>{runs.length ? `${runs.length} run(s)` : "No runs yet"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-xl border border-border/70">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr className="border-b border-border/70">
                      <th className="py-2 pl-3">#</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th className="pr-3">Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b border-border/70">
                        <td className="py-3 pl-3">{r.number}</td>
                        <td className="py-3 text-xs">
                          <Badge>{r.status}</Badge>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {r.startedAt ? new Date(r.startedAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground">
                          {r.endedAt ? new Date(r.endedAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {!runs.length && !loading ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                          No runs yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artifacts">
          <Card>
            <CardHeader>
              <CardTitle>Artifacts</CardTitle>
              <CardDescription>Files, screenshots, exports, and other outputs (coming soon).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
                No artifacts available yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
