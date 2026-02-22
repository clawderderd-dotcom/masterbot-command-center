import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useDashboard } from "../state/DashboardContext";

export function DiagnosticsPage() {
  const dash = useDashboard();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connection state and basic client-side info.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gateway</CardTitle>
            <CardDescription>Control-plane connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span> {dash.gatewayConnected ? "connected" : "disconnected"}
            </div>
            {dash.lastError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {dash.lastError}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard WS</CardTitle>
            <CardDescription>Realtime event stream</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span> {dash.wsConnected ? "connected" : "disconnected"}
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: if this is disconnected, check the server process and your browser console.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
          <CardDescription>Browser environment</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-xl border border-border/70 bg-muted/30 p-4 text-xs">
            {JSON.stringify(
              {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: (navigator as any).platform,
              },
              null,
              2,
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
