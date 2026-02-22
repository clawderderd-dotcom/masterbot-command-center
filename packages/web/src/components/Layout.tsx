import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useTheme } from "../hooks/useTheme";
import { useDashboard } from "../state/DashboardContext";
import { Button } from "./ui/button";

const navItems = [
  { to: "/", label: "Overview" },
  { to: "/tasks", label: "Tasks" },
  { to: "/sessions", label: "Sessions" },
  { to: "/agents", label: "Agents" },
  { to: "/channels", label: "Channels" },
  { to: "/skills", label: "Skills" },
  { to: "/cron", label: "Automations" },
  { to: "/logs", label: "Logs" },
  { to: "/diagnostics", label: "Diagnostics" },
];

export function Layout() {
  const nav = useNavigate();
  const { theme, setTheme } = useTheme();
  const dash = useDashboard();

  return (
    <div className="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 border-r p-4 md:block">
          <div className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
            MasterBot Command Center
          </div>
          <div className="mt-1 text-xs text-slate-500">Local-first dashboard</div>

          <nav className="mt-6 space-y-1">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  cn(
                    "block rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-900",
                    isActive &&
                      "bg-slate-100 font-medium text-slate-900 dark:bg-slate-900 dark:text-slate-100",
                  )
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b bg-white/80 p-4 backdrop-blur dark:bg-slate-950/80">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">Command Center</div>
                <div className="truncate text-xs text-slate-500">
                  Ctrl/⌘+K (coming soon) • Local-only by default
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      dash.wsConnected ? "bg-emerald-500" : "bg-slate-400",
                    )}
                    title={dash.wsConnected ? "Dashboard WS connected" : "Dashboard WS disconnected"}
                  />
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      dash.gatewayConnected ? "bg-emerald-500" : "bg-amber-500",
                    )}
                    title={dash.gatewayConnected ? "Gateway connected" : "Gateway disconnected"}
                  />
                </div>

                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-950"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  aria-label="Theme"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>

                <Button variant="outline" size="sm" onClick={() => nav("/tasks?new=1")}>
                  Start new task
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
