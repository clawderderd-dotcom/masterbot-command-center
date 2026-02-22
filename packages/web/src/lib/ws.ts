import * as React from "react";
import type { TaskEvent, WsClientToServer, WsServerToClient } from "@mcc/shared";

export function useDashboardWs(opts: { onEvent: (ev: TaskEvent) => void; onError?: (msg: string) => void }) {
  const wsRef = React.useRef<WebSocket | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    let stopped = false;
    let backoff = 500;

    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(`${location.origin.replace(/^http/, "ws")}/ws/dashboard`);
      wsRef.current = ws;

      ws.onopen = () => {
        backoff = 500;
        setConnected(true);
        const msg: WsClientToServer = { type: "subscribe" };
        ws.send(JSON.stringify(msg));
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (stopped) return;
        const wait = backoff;
        backoff = Math.min(backoff * 1.7, 8000);
        window.setTimeout(connect, wait);
      };

      ws.onmessage = (ev) => {
        let msg: WsServerToClient;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (msg.type === "event") opts.onEvent(msg.event);
        if (msg.type === "error") opts.onError?.(msg.message);
      };
    };

    connect();
    return () => {
      stopped = true;
      wsRef.current?.close();
    };
  }, [opts]);

  const send = React.useCallback((msg: WsClientToServer) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }, []);

  return { connected, send };
}
