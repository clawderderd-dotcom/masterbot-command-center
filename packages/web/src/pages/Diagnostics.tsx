import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useDashboard } from "../state/DashboardContext";

export function DiagnosticsPage() {
  const dash = useDashboard();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Diagnostics</div>
        <div className="text-sm text-muted-foreground">Connection status and local environment signals.</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Connections</CardTitle>
            <CardDescription>Realtime WS + Gateway link status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dashboard WS</span>
              <Badge>{dash.wsConnected ? "Connected" : "Disconnected"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gateway</span>
              <Badge>{dash.gatewayConnected ? "Connected" : "Disconnected"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>What to check if things look wrong</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>• If Gateway is disconnected, task start/message actions may fail.</div>
            <div>• If Dashboard WS is disconnected, the UI may not auto-refresh.</div>
            <div>• You can still navigate and read cached task data.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
