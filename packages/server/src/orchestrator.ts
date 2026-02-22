import type { Db } from "./db/db.js";
import { appendRunLog, createRun, getTask, listRuns, setTaskStatus, updateRun, updateTask } from "./db/tasksRepo.js";
import type { Run, Task } from "@mcc/shared";
import { GatewayClient } from "./gateway/GatewayClient.js";
import { GatewayCompat } from "./gateway/GatewayCompat.js";
import type { GatewayFrameEvent } from "./gateway/GatewayClient.js";
import { redactSecrets } from "./util/redact.js";
import { WsHub } from "./ws/hub.js";

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function kickoffMessage(task: Task) {
  const ac = task.acceptanceCriteria?.length
    ? task.acceptanceCriteria.map((x) => `- [ ] ${x}`).join("\n")
    : "- [ ] (none provided)";
  const plan = task.suggestedPlan?.length ? task.suggestedPlan.map((x) => `- ${x}`).join("\n") : "- (auto)";

  return [
    "You are MasterBot. Execute this task step-by-step.",
    "",
    `TASK TITLE: ${task.title}`,
    "",
    "GOAL:",
    task.desiredOutcome || task.description,
    "",
    "CONTEXT:",
    task.description,
    "",
    "ACCEPTANCE CRITERIA:",
    ac,
    "",
    "SUGGESTED PLAN:",
    plan,
    "",
    "Constraints:",
    "- Be explicit about progress and next steps.",
    "- If you need input, ask a clear question and stop.",
  ].join("\n");
}

export class Orchestrator {
  private gateway: GatewayClient;
  private compat: GatewayCompat;

  // taskId -> current runId
  private activeRun = new Map<string, string>();
  // sessionKey -> taskId
  private sessionToTask = new Map<string, string>();

  constructor(
    private db: Db,
    private hub: WsHub,
    opts: { gatewayUrl: string; gatewayToken?: string; gatewayPassword?: string; stateDir: string },
  ) {
    this.gateway = new GatewayClient({
      url: opts.gatewayUrl,
      token: opts.gatewayToken,
      password: opts.gatewayPassword,
      role: "operator",
      clientName: "mcc-dashboard",
      mode: "ui",
      stateDir: opts.stateDir,
      onHello: (hello) => {
        this.hub.broadcast({ type: "gateway.connection", connected: true, hello });
      },
      onClose: (info) => {
        this.hub.broadcast({ type: "gateway.connection", connected: false, lastError: `${info.code}: ${info.reason}` });
      },
      onEvent: (ev) => this.handleGatewayEvent(ev),
    });
    this.compat = new GatewayCompat(this.gateway);
  }

  startGateway() {
    this.gateway.start();
  }

  stopGateway() {
    this.gateway.stop();
  }

  get gatewayConnected() {
    return this.gateway.connected;
  }

  async startTask(taskId: string) {
    const task = getTask(this.db, taskId);
    if (!task) throw new Error("task not found");

    const run: Run = createRun(this.db, { id: randomId(), taskId });
    this.hub.broadcast({ type: "run.created", taskId, runId: run.id });

    setTaskStatus(this.db, taskId, "Running", "started");
    this.hub.broadcast({ type: "task.status", taskId, status: "Running", reason: "started" });

    updateRun(this.db, run.id, { status: "Running", startedAt: nowIso() });
    this.hub.broadcast({ type: "run.updated", taskId, runId: run.id });

    this.activeRun.set(taskId, run.id);

    let sessionKey = task.sessionKey;
    if (!sessionKey) {
      sessionKey = await this.compat.sessionsCreate(`${task.title}`);
      updateTask(this.db, taskId, { sessionKey });
      this.hub.broadcast({ type: "task.updated", taskId });
    }

    this.sessionToTask.set(sessionKey, taskId);

    const msg = kickoffMessage(task);
    appendRunLog(this.db, { taskId, runId: run.id, ts: nowIso(), level: "info", message: "Kickoff sent." });
    this.hub.broadcast({ type: "run.log", taskId, runId: run.id, ts: nowIso(), level: "info", message: "Kickoff sent." });

    await this.compat.chatSend(sessionKey, msg);
  }

  async askUpdate(taskId: string) {
    const task = getTask(this.db, taskId);
    if (!task?.sessionKey) throw new Error("task has no session");
    const runId = this.activeRun.get(taskId) ?? listRuns(this.db, taskId)[0]?.id;
    const text = "Give me a 5-bullet progress update + next steps.";
    await this.compat.chatSend(task.sessionKey, text);
    if (runId) {
      appendRunLog(this.db, { taskId, runId, ts: nowIso(), level: "info", message: "Asked for update." });
      this.hub.broadcast({ type: "run.log", taskId, runId, ts: nowIso(), level: "info", message: "Asked for update." });
    }
  }

  async sendMessage(taskId: string, text: string) {
    const task = getTask(this.db, taskId);
    if (!task?.sessionKey) throw new Error("task has no session");
    await this.compat.chatSend(task.sessionKey, text);
  }

  async cancelTask(taskId: string) {
    const task = getTask(this.db, taskId);
    if (!task) throw new Error("task not found");
    setTaskStatus(this.db, taskId, "Cancelled", "cancelled by operator");
    this.hub.broadcast({ type: "task.status", taskId, status: "Cancelled", reason: "cancelled by operator" });
  }

  private handleGatewayEvent(ev: GatewayFrameEvent) {
    // Best-effort mapping of gateway events to run logs.
    // We avoid schema assumptions; just stringify & redact.
    const eventName = ev.event;
    const payload = ev.payload ?? {};

    // Try to locate a session id/key inside the payload
    const sessionKey =
      (payload as any)?.sessionId || (payload as any)?.sessionKey || (payload as any)?.session?.id;
    const taskId = typeof sessionKey === "string" ? this.sessionToTask.get(sessionKey) : undefined;
    if (!taskId) return;

    const runId = this.activeRun.get(taskId) ?? null;
    if (!runId) return;

    // Detect needs input if event suggests question
    const text = redactSecrets(safeToText(eventName, payload));
    appendRunLog(this.db, { taskId, runId, ts: nowIso(), level: "info", message: text });
    this.hub.broadcast({ type: "run.log", taskId, runId, ts: nowIso(), level: "info", message: text });

    if (looksLikeNeedsInput(eventName, payload)) {
      setTaskStatus(this.db, taskId, "NeedsInput", "agent requested input");
      this.hub.broadcast({ type: "task.status", taskId, status: "NeedsInput", reason: "agent requested input" });
    }

    if (looksLikeDone(eventName, payload)) {
      setTaskStatus(this.db, taskId, "Done", "completed");
      this.hub.broadcast({ type: "task.status", taskId, status: "Done", reason: "completed" });
      updateRun(this.db, runId, { status: "Done", endedAt: nowIso(), outcome: "completed" });
      this.hub.broadcast({ type: "run.updated", taskId, runId });
      this.activeRun.delete(taskId);
    }
  }
}

function safeToText(event: string, payload: unknown) {
  let msg = "";
  // try common shapes
  const p: any = payload as any;
  const content = p?.text ?? p?.message?.text ?? p?.message?.content ?? p?.content;
  if (typeof content === "string" && content.trim()) {
    msg = content;
  } else {
    msg = JSON.stringify(payload);
  }
  return `[${event}] ${msg}`;
}

function looksLikeNeedsInput(event: string, payload: unknown) {
  const e = event.toLowerCase();
  if (e.includes("needs_input") || e.includes("question")) return true;
  const text = safeToText(event, payload).toLowerCase();
  return text.includes("i need") && text.includes("?");
}

function looksLikeDone(event: string, payload: unknown) {
  const e = event.toLowerCase();
  if (e.includes("task.done") || e.includes("run.done")) return true;
  const text = safeToText(event, payload).toLowerCase();
  return text.includes("completed") && (text.includes("acceptance") || text.includes("done"));
}
