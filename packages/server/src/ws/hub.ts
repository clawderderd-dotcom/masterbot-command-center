import type WebSocket from "ws";
import type { TaskEvent, WsServerToClient } from "@mcc/shared";

export type ClientInfo = {
  ws: WebSocket;
  subscriptions: { all: boolean; taskIds: Set<string> };
};

export class WsHub {
  private clients = new Set<ClientInfo>();

  addClient(ws: WebSocket) {
    const info: ClientInfo = { ws, subscriptions: { all: true, taskIds: new Set() } };
    this.clients.add(info);
    ws.on("close", () => this.clients.delete(info));
    return info;
  }

  setSubscriptions(info: ClientInfo, taskId?: string) {
    if (!taskId) {
      info.subscriptions.all = true;
      info.subscriptions.taskIds.clear();
      return;
    }
    info.subscriptions.all = false;
    info.subscriptions.taskIds.add(taskId);
  }

  removeSubscriptions(info: ClientInfo, taskId?: string) {
    if (!taskId) {
      info.subscriptions.all = true;
      info.subscriptions.taskIds.clear();
      return;
    }
    info.subscriptions.taskIds.delete(taskId);
  }

  broadcast(event: TaskEvent) {
    const msg: WsServerToClient = { type: "event", event };
    const raw = JSON.stringify(msg);
    for (const c of this.clients) {
      if (c.ws.readyState !== c.ws.OPEN) continue;
      if (c.subscriptions.all) {
        c.ws.send(raw);
        continue;
      }
      const taskId = (event as any).taskId as string | undefined;
      if (!taskId) continue;
      if (c.subscriptions.taskIds.has(taskId)) c.ws.send(raw);
    }
  }

  sendError(ws: WebSocket, message: string) {
    const msg: WsServerToClient = { type: "error", message };
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }
}
