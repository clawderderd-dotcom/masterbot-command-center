import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  ArrowRight,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  MessageCircleQuestion,
  OctagonX,
  Play,
  Search,
  Terminal,
} from "lucide-react";

import { Dialog, DialogContent } from "./ui/dialog";
import { apiAskUpdate, apiCancelTask, apiListTasks, apiStartTask } from "../lib/api";
import { cn } from "../lib/utils";
import { useToast } from "./ui/use-toast";

type PaletteTask = { id: string; title: string; status?: string };

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  const matchTask = /\/tasks\/(.+)$/.exec(location.pathname);
  const currentTaskId = matchTask?.[1];

  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [tasks, setTasks] = React.useState<PaletteTask[]>([]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiListTasks();
        if (cancelled) return;
        setTasks(res.tasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status })));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function doTaskAction(kind: "start" | "ask" | "cancel", taskId: string) {
    try {
      if (kind === "start") await apiStartTask(taskId);
      if (kind === "ask") await apiAskUpdate(taskId);
      if (kind === "cancel") await apiCancelTask(taskId);

      toast({
        title: "Action sent",
        description:
          kind === "start" ? `Started ${taskId}` : kind === "ask" ? `Requested update for ${taskId}` : `Cancelled ${taskId}`,
      });
    } catch (e: any) {
      toast({ title: "Action failed", description: String(e?.message ?? e) });
    }
  }

  const filteredTasks = tasks
    .filter((t) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.status ?? "").toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <Command className="flex h-[420px] w-full flex-col overflow-hidden rounded-xl">
          <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search commands, pages, and tasks…"
              className={cn(
                "flex h-10 w-full bg-transparent text-sm outline-none",
                "placeholder:text-muted-foreground",
              )}
              autoFocus
            />
            {loading ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>

          <Command.List className="flex-1 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>

            <Command.Group
              heading="Quick actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <Item
                icon={<ListChecks className="size-4" />}
                value="new task"
                onSelect={() => {
                  onOpenChange(false);
                  nav("/tasks?new=1");
                }}
              >
                New task
              </Item>

              <Item
                icon={<LayoutDashboard className="size-4" />}
                value="go overview"
                onSelect={() => {
                  onOpenChange(false);
                  nav("/");
                }}
              >
                Go to Overview
              </Item>

              <Item
                icon={<ListChecks className="size-4" />}
                value="go tasks"
                onSelect={() => {
                  onOpenChange(false);
                  nav("/tasks");
                }}
              >
                Go to Tasks
              </Item>
            </Command.Group>

            {currentTaskId ? (
              <Command.Group
                heading="This task"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                <Item
                  icon={<Play className="size-4" />}
                  value={`start ${currentTaskId}`}
                  onSelect={async () => {
                    onOpenChange(false);
                    await doTaskAction("start", currentTaskId);
                  }}
                >
                  Start run
                </Item>
                <Item
                  icon={<MessageCircleQuestion className="size-4" />}
                  value={`ask update ${currentTaskId}`}
                  onSelect={async () => {
                    onOpenChange(false);
                    await doTaskAction("ask", currentTaskId);
                  }}
                >
                  Ask for update
                </Item>
                <Item
                  icon={<OctagonX className="size-4" />}
                  value={`cancel ${currentTaskId}`}
                  onSelect={async () => {
                    onOpenChange(false);
                    await doTaskAction("cancel", currentTaskId);
                  }}
                >
                  Cancel task
                </Item>
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Jump to task"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {filteredTasks.map((t) => (
                <Item
                  key={t.id}
                  icon={<Terminal className="size-4" />}
                  value={`task ${t.id} ${t.title}`}
                  onSelect={() => {
                    onOpenChange(false);
                    nav(`/tasks/${t.id}`);
                  }}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{t.title}</span>
                    {t.status ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t.status}</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{t.id.slice(0, 8)}</span>
                </Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ArrowRight className="size-3" /> Enter to select
            </span>
            <span>Esc to close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({
  icon,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Command.Item> & {
  icon?: React.ReactNode;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-lg px-2 py-2 text-sm",
        "outline-none",
        "aria-selected:bg-accent aria-selected:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </Command.Item>
  );
}
