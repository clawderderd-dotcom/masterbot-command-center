import { GatewayClient, GatewayError } from "./GatewayClient.js";

function isUnknownMethod(err: unknown) {
  const e = err as any;
  const msg = String(e?.message ?? "");
  const code = String(e?.code ?? "");
  return (
    code.toLowerCase().includes("unknown") ||
    msg.toLowerCase().includes("unknown method") ||
    msg.toLowerCase().includes("method not found")
  );
}

async function tryMethods<T>(
  client: GatewayClient,
  methods: Array<{ method: string; params: any }>,
): Promise<T> {
  let lastErr: any = null;
  for (const m of methods) {
    try {
      return await client.request<T>(m.method, m.params);
    } catch (e) {
      lastErr = e;
      if (isUnknownMethod(e)) continue;
      throw e;
    }
  }
  const msg =
    lastErr instanceof Error
      ? lastErr.message
      : typeof lastErr === "string"
        ? lastErr
        : "unknown error";
  throw new GatewayError(`no compatible method found (${msg})`, { code: "compat_failed" });
}

export class GatewayCompat {
  constructor(private client: GatewayClient) {}

  async sessionsCreate(title: string): Promise<string> {
    const res = await tryMethods<any>(this.client, [
      { method: "sessions.create", params: { title } },
      { method: "session.create", params: { title } },
      { method: "sessions.new", params: { title } },
    ]);

    const id = res?.id ?? res?.sessionId ?? res?.key ?? res?.sessionKey;
    if (typeof id !== "string") {
      throw new GatewayError("sessions.create returned unexpected payload", { details: res });
    }
    return id;
  }

  async sessionsList(): Promise<any> {
    return tryMethods<any>(this.client, [
      { method: "sessions.list", params: {} },
      { method: "session.list", params: {} },
    ]);
  }

  async chatSend(sessionKey: string, text: string): Promise<any> {
    return tryMethods<any>(this.client, [
      { method: "chat.send", params: { sessionId: sessionKey, text } },
      { method: "chat.send", params: { sessionKey, text } },
      { method: "chat.send", params: { sessionId: sessionKey, message: { role: "user", content: text } } },
      { method: "chat.post", params: { sessionId: sessionKey, text } },
      { method: "chat.message", params: { sessionId: sessionKey, text } },
    ]);
  }

  async chatAbort(sessionKey: string): Promise<any> {
    return tryMethods<any>(this.client, [
      { method: "chat.abort", params: { sessionId: sessionKey } },
      { method: "chat.stop", params: { sessionId: sessionKey } },
    ]);
  }

  async channelsStatus(): Promise<any> {
    return tryMethods<any>(this.client, [
      { method: "channels.status", params: {} },
      { method: "channel.status", params: {} },
    ]);
  }

  async skillsList(): Promise<any> {
    return tryMethods<any>(this.client, [
      { method: "skills.list", params: {} },
      { method: "skill.list", params: {} },
    ]);
  }

  async cronList(): Promise<any> {
    return tryMethods<any>(this.client, [
      { method: "cron.list", params: {} },
      { method: "crons.list", params: {} },
      { method: "automations.list", params: {} },
    ]);
  }
}
