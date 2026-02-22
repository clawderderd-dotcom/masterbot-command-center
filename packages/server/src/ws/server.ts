import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import type http from "node:http";
import type { WsClientToServer } from "@mcc/shared";
import { WsHub } from "./hub.js";
import { Orchestrator } from "../orchestrator.js";

export function attachDashboardWs(server: http.Server, hub: WsHub, orchestrator: Orchestrator) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/ws/dashboard") return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws as any, req);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    const client = hub.addClient(ws);

    ws.on("message", async (data: WebSocket.RawData) => {
      let msg: WsClientToServer;
      try {
        msg = JSON.parse(String(data));
      } catch {
        hub.sendError(ws, "invalid json");
        return;
      }

      try {
        switch (msg.type) {
          case "subscribe":
            hub.setSubscriptions(client, msg.taskId);
            return;
          case "unsubscribe":
            hub.removeSubscriptions(client, msg.taskId);
            return;
          case "gateway.connect":
            orchestrator.startGateway();
            return;
          case "gateway.disconnect":
            orchestrator.stopGateway();
            return;
          case "task.start":
            await orchestrator.startTask(msg.taskId);
            return;
          case "task.cancel":
            await orchestrator.cancelTask(msg.taskId);
            return;
          case "task.askUpdate":
            await orchestrator.askUpdate(msg.taskId);
            return;
          case "task.sendMessage":
            await orchestrator.sendMessage(msg.taskId, msg.text);
            return;
          default:
            hub.sendError(ws, "unknown message type");
        }
      } catch (e: any) {
        hub.sendError(ws, String(e?.message ?? e));
      }
    });
  });

  return wss;
}
