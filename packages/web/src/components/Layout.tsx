import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Boxes,
  CalendarClock,
  ChevronDown,
  CircleDot,
  Columns3,
  FileText,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessagesSquare,
  Moon,
  Search,
  Settings2,
  Sun,
  Wrench,
} from "lucide-react";

import { cn } from "../lib/utils";
import { useTheme } from "../hooks/useTheme";
import { useDashboard } from "../state/DashboardContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { CommandPalette } from "./CommandPalette";
import { ToastProviderState } from "./ui/use-toast";
import { Toaster } from "./ui/toaster";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  section: "Workspace" | "System" | "Automation" | "Observability";
};

const navItems: NavItem[] = [
  { to: "/", label: "Overview", icon: <LayoutDashboard className="size-4" />, section: "Workspace" },
  { to: "/tasks", label: "Tasks", icon: <ListChecks className="size-4" />, section: "Workspace" },

  { to: "/sessions", label: "Sessions", icon: <MessagesSquare className="size-4" />, section: "System" },
  { to: "/agents", label: "Agents", icon: <Boxes className="size-4" />, section: "System" },
  { to: "/channels", label: "Channels", icon: <Columns3 className="size-4" />, section: "System" },

  { to: "/skills", label: "Skills", icon: <Wrench className="size-4" />, section: "Automation" },
  { to: "/cron", label: "Automations", icon: <CalendarClock className="size-4" />, section: "Automation" },

  { to: "/logs", label: "Logs", icon: <FileText className="size-4" />, section: "Observability" },
  { to: "/diagnostics", label: "Diagnostics", icon: <Activity className="size-4" />, section: "Observability" },
];

function NavGroup({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="space-y-1">
      <div className="px-2 pt-4 text-[11px] font-medium text-muted-foreground">{title}</div>
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
              "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              isActive && "bg-sidebar-accent text-foreground",
            )
          }
        >
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-sidebar-muted text-muted-foreground group-hover:text-foreground">
            {it.icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{it.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

function ConnectionPill({ ws, gateway }: { ws: boolean; gateway: boolean }) {
  const ok = ws && gateway;
  return (
    <div
      className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", "border-border/70 bg-card")}
      title={`Dashboard WS: ${ws ? "connected" : "disconnected"} • Gateway: ${gateway ? "connected" : "disconnected"}`}
    >
      <span className={cn("inline-flex items-center gap-1", ok ? "text-success" : "text-warning")}>
        <CircleDot className="size-3" />
        {ok ? "Connected" : "Degraded"}
      </span>
      <span className="text-muted-foreground">•</span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span className={cn("inline-block size-2 rounded-full", ws ? "bg-success" : "bg-muted-foreground")} /> WS
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span className={cn("inline-block size-2 rounded-full", gateway ? "bg-success" : "bg-warning")} /> GW
      </span>
    </div>
  );
}

export function Layout() {
  const nav = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const dash = useDashboard();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebar = (
    <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-3 py-3">
        <button
          onClick={() => nav("/")}
          className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-sidebar-accent"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GitBranch className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">MasterBot</span>
            <span className="block truncate text-[11px] text-muted-foreground">Command Center</span>
          </span>
        </button>

        <div className="hidden md:block">
          <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
            <Search />
          </Button>
        </div>
      </div>

      <div className="px-3">
        <Separator className="bg-border/60" />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <NavGroup title="Workspace" items={navItems.filter((x) => x.section === "Workspace")} onNavigate={() => setMobileOpen(false)} />
        <NavGroup title="System" items={navItems.filter((x) => x.section === "System")} onNavigate={() => setMobileOpen(false)} />
        <NavGroup title="Automation" items={navItems.filter((x) => x.section === "Automation")} onNavigate={() => setMobileOpen(false)} />
        <NavGroup title="Observability" items={navItems.filter((x) => x.section === "Observability")} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="px-3 pb-3">
        <div className="rounded-xl border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">Status</div>
            <Settings2 className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <ConnectionPill ws={dash.wsConnected} gateway={dash.gatewayConnected} />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Ctrl/⌘+K for commands</div>
        </div>
      </div>
    </aside>
  );

  return (
    <ToastProviderState>
      <div className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
          <div className="hidden w-[280px] shrink-0 border-r border-border/70 md:block">{sidebar}</div>

          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogContent className="h-[90vh] max-w-[320px] p-0">{sidebar}</DialogContent>
          </Dialog>

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur">
              <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu />
                  </Button>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">Command Center</div>
                    <div className="truncate text-xs text-muted-foreground">Local-first • Dark-mode-first</div>
                  </div>
                </div>

                <div className="hidden min-w-[320px] max-w-[520px] flex-1 md:flex">
                  <button
                    onClick={() => setPaletteOpen(true)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2",
                      "text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none",
                    )}
                  >
                    <Search className="size-4" />
                    <span className="flex-1">Search tasks, actions, pages…</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px]">Ctrl K</span>
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden lg:block">
                    <ConnectionPill ws={dash.wsConnected} gateway={dash.gatewayConnected} />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        {theme === "dark" ? <Moon /> : <Sun />}
                        <span className="hidden sm:inline">Theme</span>
                        <ChevronDown className="size-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setTheme("system")}>System</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setTheme("dark")}>Dark</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setTheme("light")}>Light</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="default" size="sm" onClick={() => nav("/tasks?new=1")}>
                    Start new task
                  </Button>
                </div>
              </div>
            </header>

            <main className="px-4 py-6 md:px-6">
              <Outlet />
            </main>
          </div>
        </div>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <Toaster />
      </div>
    </ToastProviderState>
  );
}
