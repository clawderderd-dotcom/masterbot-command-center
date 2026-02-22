import * as React from "react";
import { Link } from "react-router-dom";
import { apiListTasks } from "../lib/api";
import { useDashboard } from "../state/DashboardContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export function OverviewPage() {
  const dash = useDashboard();
  const [counts, setCounts] = React.useState({ running: 0, blocked: 0, doneToday: 0, total: 0 });

  React.useEffect(() => {
    (async () => {
      const { tasks } = await apiListTasks();
      const running = tasks.filter((t) => t.status === "Running").length;
      const blocked = tasks.filter((t) => t.status === "Blocked").length;
      const today = new Date();
      const ymd = today.toISOString().slice(0, 10);
      const doneToday = tasks.filter((t) => t.status === "Done" && t.updatedAt.slice(0, 10) === ymd).length;
      setCounts({ running, blocked, doneToday, total: tasks.length });
    })().catch(() => {
      // ignore
    });
  }, [dash.bump]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-balance text-xl font-semibold tracking-tight">Overview</div>
          <div className="mt-1 text-sm text-muted-foreground">Gateway + tasks status at a glance.</div>
        </div>
        <Button asChild>
          <Link to="/tasks?new=1">Start new task</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Gateway</CardTitle>
            <CardDescription>Control-plane connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dash.gatewayConnected ? "Connected" : "Offline"}</div>
            {dash.lastError ? <div className="mt-2 text-xs text-warning">{dash.lastError}</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Running</CardTitle>
            <CardDescription>Active tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.running}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blocked</CardTitle>
            <CardDescription>Need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.blocked}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed today</CardTitle>
            <CardDescription>Done tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.doneToday}</div>
            <div className="mt-1 text-xs text-muted-foreground">Total: {counts.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Basic event-driven refresh (more coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            This MVP streams gateway events into task run logs. Next steps: richer activity feed and state transitions.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
