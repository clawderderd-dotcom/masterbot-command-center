import * as React from "react";
import type { TaskEvent } from "@mcc/shared";
import { useDashboardWs } from "../lib/ws";

export type DashboardState = {
  wsConnected: boolean;
  gatewayConnected: boolean;
  lastGatewayHello?: unknown;
  lastError?: string | null;
  bump: number; // increments on any event, for easy refetch
};

const Ctx = React.createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DashboardState>({
    wsConnected: false,
    gatewayConnected: false,
    lastError: null,
    bump: 0,
  });

  const ws = useDashboardWs({
    onEvent: (ev: TaskEvent) => {
      setState((s) => {
        const next: DashboardState = { ...s, bump: s.bump + 1 };
        if (ev.type === "gateway.connection") {
          next.gatewayConnected = ev.connected;
          next.lastGatewayHello = ev.hello;
          next.lastError = ev.lastError ?? null;
        }
        return next;
      });
    },
    onError: (msg) => setState((s) => ({ ...s, lastError: msg })),
  });

  React.useEffect(() => {
    setState((s) => ({ ...s, wsConnected: ws.connected }));
  }, [ws.connected]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("DashboardProvider missing");
  return v;
}
