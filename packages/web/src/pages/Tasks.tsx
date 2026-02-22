import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Task } from "@mcc/shared";
import { ArrowDownAZ, ArrowDownNarrowWide, Filter, Plus, RefreshCw } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Skeleton } from "../components/ui/skeleton";
import { useToast } from "../components/ui/use-toast";
import { cn } from "../lib/utils";

function statusColor(status: Task["status"]) {
  switch (status) {
    case "Running":
      return "bg-success";
    case "Queued":
      return "bg-info";
    case "Blocked":
      return "bg-destructive";
    case "NeedsInput":
      return "bg-warning";
    case "Done":
      return "bg-muted-foreground";
    default:
      return "bg-muted-foreground/40";
  }
}

const statuses: Array<Task["status"] | "All"> = [
  "All",
  "Draft",
  "Queued",
  "Running",
  "NeedsInput",
  "Blocked",
  "Done",
];

type SortKey = "updatedDesc" | "updatedAsc" | "titleAsc" | "statusAsc";

export function TasksPage() {
  const dash = useDashboard();
  const { toast } = useToast();
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

  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<(typeof statuses)[number]>("All");
  const [sort, setSort] = React.useState<SortKey>("updatedDesc");

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
        mode === "quick" ? { mode: "quick", quickText } : { mode: "advanced", title, description, desiredOutcome };
      const res = await apiCreateTask(body);
      setOpen(false);
      setQuickText("");
      setTitle("");
      setDescription("");
      setDesiredOutcome("");
      await refresh();
      await apiStartTask(res.task.id);
      toast({ title: "Task started", description: res.task.title });
      await refresh();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      toast({ title: "Failed to create task", description: String(e?.message ?? e) });
    }
  }

  const view = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    let list = tasks.slice();
    if (status !== "All") list = list.filter((t) => t.status === status);

    if (needle) {
      list = list.filter((t) => {
        const hay = [t.title, t.description, t.desiredOutcome, t.sessionKey, t.priority, ...(t.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    const byUpdated = (a: Task, b: Task) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
    const byTitle = (a: Task, b: Task) => a.title.localeCompare(b.title);
    const byStatus = (a: Task, b: Task) => String(a.status).localeCompare(String(b.status));

    list.sort((a, b) => {
      switch (sort) {
        case "updatedAsc":
          return byUpdated(a, b);
        case "updatedDesc":
          return byUpdated(b, a);
        case "titleAsc":
          return byTitle(a, b);
        case "statusAsc":
          return byStatus(a, b);
      }
    });

    return list;
  }, [query, sort, status, tasks]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Tasks</div>
          <div className="text-sm text-muted-foreground">Create, start, and monitor task runs.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                New task
              </Button>
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
                  <div className="text-xs text-muted-foreground">Describe the task. We’ll structure it automatically.</div>
                  <Textarea
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    placeholder="Example: Implement WS reconnect handling and add a Tasks list view."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid gap-2">
                    <label className="text-xs text-muted-foreground">Title</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs text-muted-foreground">Desired outcome</label>
                    <Textarea value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} />
                  </div>
                </div>
              )}

              {err ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {err}
                </div>
              ) : null}

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
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All tasks</CardTitle>
              <CardDescription>
                {loading ? "Loading…" : `${view.length} shown / ${tasks.length} total`} • Gateway:{" "}
                {dash.gatewayConnected ? "connected" : "disconnected"}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[220px] flex-1 md:min-w-[280px]">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, tags, session…" />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="size-4" />
                    {status === "All" ? "Status" : status}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statuses.map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => setStatus(s)}>
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowDownNarrowWide className="size-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setSort("updatedDesc")}>Updated (newest)</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSort("updatedAsc")}>Updated (oldest)</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSort("titleAsc")}>Title (A→Z)</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSort("statusAsc")}>Status</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {err ? (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {err}
            </div>
          ) : null}

          <div className="overflow-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr className="border-b border-border/70">
                  <th className="py-2 pl-3">Status</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Session</th>
                  <th>Updated</th>
                  <th className="pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/70">
                      <td className="py-3 pl-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2 w-2 rounded-full" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-4 w-[320px]" />
                        <div className="mt-2 flex gap-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-14" />
                        </div>
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-3 w-12" />
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-3 w-24" />
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-3 w-28" />
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <Skeleton className="ml-auto h-8 w-20" />
                      </td>
                    </tr>
                  ))
                ) : (
                  view.map((t) => (
                    <tr key={t.id} className="border-b border-border/70 align-top">
                      <td className="py-3 pl-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", statusColor(t.status))} />
                          <span className="text-xs">{t.status}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">
                          <Link className="hover:underline" to={`/tasks/${t.id}`}>
                            {t.title}
                          </Link>
                        </div>
                        {t.tags.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {t.tags.slice(0, 6).map((tag) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 text-xs">{t.priority}</td>
                      <td className="py-3 text-xs text-muted-foreground">{t.sessionKey ?? "—"}</td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(t.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await apiStartTask(t.id);
                            toast({ title: "Task started", description: t.title });
                            await refresh();
                          }}
                          disabled={!dash.gatewayConnected && t.status !== "Draft"}
                        >
                          <ArrowDownAZ className="size-4" />
                          Start
                        </Button>
                      </td>
                    </tr>
                  ))
                )}

                {!loading && !view.length ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No tasks match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Tip: press Ctrl/⌘+K and type “tasks” to navigate fast.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
