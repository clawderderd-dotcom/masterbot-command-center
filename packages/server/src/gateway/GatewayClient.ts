import WebSocket from "ws";
import path from "node:path";
import { buildDeviceAuthPayload } from "./deviceAuth.js";
import {
  loadOrCreateDeviceIdentity,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload,
} from "./deviceIdentity.js";
import {
  clearDeviceAuthToken,
  loadDeviceAuthToken,
  storeDeviceAuthToken,
} from "./deviceAuthStore.js";

export type GatewayFrameReq = { type: "req"; id: string; method: string; params?: unknown };
export type GatewayFrameRes = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string; details?: unknown; retryable?: boolean; retryAfterMs?: number };
};

export class GatewayError extends Error {
  code?: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;

  constructor(message: string, fields?: Partial<GatewayError>) {
    super(message);
    Object.assign(this, fields ?? {});
  }
}

export type GatewayFrameEvent = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: { presence: number; health: number };
};
export type GatewayFrame = GatewayFrameReq | GatewayFrameRes | GatewayFrameEvent;

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type GatewayClientOpts = {
  url: string;
  token?: string;
  password?: string;
  clientName?: string; // e.g. clawdbot-control-ui
  clientVersion?: string;
  platform?: string;
  mode?: "webchat" | "ui" | "cli" | "backend" | "probe" | "test";
  instanceId?: string;
  role?: string; // operator
  scopes?: string[]; // operator.admin ...

  // where to persist device identity + rotated device token
  stateDir?: string; // default: packages/server/data

  onHello?: (hello: any) => void;
  onEvent?: (ev: GatewayFrameEvent) => void;
  onClose?: (info: { code: number; reason: string }) => void;
  onGap?: (info: { expected: number; received: number }) => void;
};

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<
    string,
    { resolve: (v: any) => void; reject: (e: any) => void; method: string }
  >();
  private closed = false;
  private backoffMs = 800;
  private lastSeq: number | null = null;
  private connectSent = false;
  private connectTimer: NodeJS.Timeout | null = null;
  private connectNonce: string | null = null;

  private stateDir: string;
  private deviceIdentity;

  constructor(private opts: GatewayClientOpts) {
    // Default to a per-package state directory (packages/server/data) by resolving
    // relative to the current working directory when running inside @mcc/server.
    this.stateDir = opts.stateDir ?? path.resolve(process.cwd(), "data");
    this.deviceIdentity = loadOrCreateDeviceIdentity(path.join(this.stateDir, "device.json"));
  }

  start() {
    this.closed = false;
    this.connect();
  }

  stop() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
    this.flushPending(new Error("gateway client stopped"));
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private connect() {
    if (this.closed) return;

    this.ws = new WebSocket(this.opts.url);
    this.ws.on("open", () => this.queueConnect());
    this.ws.on("message", (data: WebSocket.RawData) => this.handleMessage(String(data)));
    this.ws.on("close", (code: number, buf: Buffer) => {
      const reason = buf?.toString?.() ?? "";
      this.ws = null;
      this.flushPending(new Error(`gateway closed (${code}): ${reason}`));
      this.opts.onClose?.({ code, reason });
      this.scheduleReconnect();
    });
    this.ws.on("error", () => {
      // close handler will do reconnect + flush.
    });
  }

  private scheduleReconnect() {
    if (this.closed) return;
    const wait = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15000);
    setTimeout(() => this.connect(), wait);
  }

  private flushPending(err: Error) {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }

  private queueConnect() {
    this.connectNonce = null;
    this.connectSent = false;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => this.sendConnect(), 250);
  }

  private async sendConnect() {
    if (this.connectSent) return;
    this.connectSent = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    const clientName = this.opts.clientName ?? "gateway-client";
    const role = this.opts.role ?? "operator";
    const scopes = this.opts.scopes ?? ["operator.admin", "operator.approvals", "operator.pairing"];

    const deviceTokenPath = path.join(this.stateDir, "device-auth.json");
    const stored = loadDeviceAuthToken(deviceTokenPath, {
      deviceId: this.deviceIdentity.deviceId,
      role,
    })?.token;

    const authToken = stored ?? this.opts.token ?? undefined;
    const canFallbackToShared = Boolean(stored && this.opts.token);

    const auth = authToken || this.opts.password ? { token: authToken, password: this.opts.password } : undefined;

    const signedAtMs = Date.now();
    const nonce = this.connectNonce ?? undefined;

    const devicePayload = buildDeviceAuthPayload({
      deviceId: this.deviceIdentity.deviceId,
      clientId: clientName,
      clientMode: this.opts.mode ?? "ui",
      role,
      scopes,
      signedAtMs,
      token: authToken ?? null,
      nonce,
    });

    const device = {
      id: this.deviceIdentity.deviceId,
      publicKey: publicKeyRawBase64UrlFromPem(this.deviceIdentity.publicKeyPem),
      signature: signDevicePayload(this.deviceIdentity.privateKeyPem, devicePayload),
      signedAt: signedAtMs,
      nonce,
    };

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: clientName,
        version: this.opts.clientVersion ?? "dev",
        platform: this.opts.platform ?? process.platform,
        mode: this.opts.mode ?? "ui",
        instanceId: this.opts.instanceId ?? randomId(),
      },
      role,
      scopes,
      caps: [],
      auth,
      device,
      locale: "en-US",
      userAgent: `mcc-server/${process.version}`,
    };

    try {
      const hello = await this.request<any>("connect", params);
      const authInfo = (hello as any)?.auth;
      if (authInfo?.deviceToken) {
        storeDeviceAuthToken(deviceTokenPath, {
          deviceId: this.deviceIdentity.deviceId,
          role: authInfo.role ?? role,
          token: authInfo.deviceToken,
          scopes: authInfo.scopes ?? [],
        });
      }
      this.backoffMs = 800;
      this.opts.onHello?.(hello);
    } catch (e) {
      if (canFallbackToShared) {
        clearDeviceAuthToken(deviceTokenPath, { deviceId: this.deviceIdentity.deviceId, role });
      }
      // Clawdbot UI uses 4008 on connect failed
      this.ws?.close(4008, "connect failed");
    }

  }

  private handleMessage(raw: string) {
    let frame: GatewayFrame;
    try {
      frame = JSON.parse(raw);
    } catch {
      return;
    }

    if (frame.type === "event") {
      if (frame.event === "connect.challenge") {
        const nonce = (frame.payload as any)?.nonce;
        if (typeof nonce === "string") {
          this.connectNonce = nonce;
          // resend connect with nonce populated. For servers that require signed device, this still may fail,
          // but it gives a compatibility path.
          void this.sendConnect();
        }
        return;
      }

      const seq = typeof frame.seq === "number" ? frame.seq : null;
      if (seq !== null) {
        if (this.lastSeq !== null && seq > this.lastSeq + 1) {
          this.opts.onGap?.({ expected: this.lastSeq + 1, received: seq });
        }
        this.lastSeq = seq;
      }

      this.opts.onEvent?.(frame);
      return;
    }

    if (frame.type === "res") {
      const pending = this.pending.get(frame.id);
      if (!pending) return;
      this.pending.delete(frame.id);
      if (frame.ok) pending.resolve(frame.payload);
      else {
        const e = new GatewayError(frame.error?.message ?? `request failed (${pending.method})`, {
          code: frame.error?.code,
          details: frame.error?.details,
          retryable: frame.error?.retryable,
          retryAfterMs: frame.error?.retryAfterMs,
        });
        pending.reject(e);
      }
      return;
    }
  }

  request<T = any>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("gateway not connected"));
    }
    const id = randomId();
    const frame: GatewayFrameReq = { type: "req", id, method, params };
    const p = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
    });
    this.ws.send(JSON.stringify(frame));
    return p;
  }
}
