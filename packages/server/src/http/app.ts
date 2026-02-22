import Fastify from "fastify";
import type { Db } from "../db/db.js";
import { createTask, getTask, listRunLogs, listRuns, listTasks, setTaskStatus, updateTask } from "../db/tasksRepo.js";
import type { TaskPriority } from "@mcc/shared";
import { Orchestrator } from "../orchestrator.js";

function parseBody<T>(body: unknown): T {
  return body as T;
}

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function quickToTask(input: string) {
  const text = String(input ?? "").trim();
  const title = text.split(/\n|\.|\!/)[0]?.slice(0, 80) || "New task";
  return {
    title,
    description: text,
    desiredOutcome: text,
    acceptanceCriteria: ["Result delivered and verified."],
    suggestedPlan: ["Summarize approach", "Execute step-by-step", "Verify acceptance criteria"],
  };
}

export function buildApp(db: Db, orchestrator: Orchestrator) {
  const app = Fastify({ logger: true });

  // Basic JSON + local-only security header hints
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    return payload;
  });

  app.get("/api/health", async () => ({ ok: true, gatewayConnected: orchestrator.gatewayConnected }));

  app.get("/api/tasks", async () => ({ tasks: listTasks(db) }));

  app.post("/api/tasks", async (req, reply) => {
    const body = parseBody<any>(req.body);

    const mode = body?.mode ?? (body?.quickText ? "quick" : "advanced");
    const assignedAgentId = String(body?.assignedAgentId ?? "main");
    const priority = (String(body?.priority ?? "Normal") as TaskPriority) || "Normal";
    const tags = Array.isArray(body?.tags) ? body.tags.map((x: any) => String(x)) : [];
    const dueAt = body?.dueAt ? String(body.dueAt) : null;

    const base =
      mode === "quick"
        ? quickToTask(String(body?.quickText ?? ""))
        : {
            title: String(body?.title ?? "New task"),
            description: String(body?.description ?? ""),
            desiredOutcome: String(body?.desiredOutcome ?? body?.description ?? ""),
            acceptanceCriteria: Array.isArray(body?.acceptanceCriteria)
              ? body.acceptanceCriteria.map((x: any) => String(x))
              : [],
            suggestedPlan: Array.isArray(body?.suggestedPlan) ? body.suggestedPlan.map((x: any) => String(x)) : [],
          };

    const task = createTask(db, {
      id: randomId(),
      ...base,
      priority,
      tags,
      dueAt,
      assignedAgentId,
    });

    reply.code(201);
    return { task };
  });

  app.get("/api/tasks/:taskId", async (req, reply) => {
    const taskId = (req.params as any).taskId as string;
    const task = getTask(db, taskId);
    if (!task) return reply.code(404).send({ error: "not_found" });
    const runs = listRuns(db, taskId);
    const latestRun = runs[0] ?? null;
    const logs = latestRun ? listRunLogs(db, latestRun.id) : [];
    return { task, runs, latestRun, logs };
  });

  app.post("/api/tasks/:taskId/start", async (req, reply) => {
    const taskId = (req.params as any).taskId as string;
    try {
      await orchestrator.startTask(taskId);
      return { ok: true };
    } catch (e: any) {
      req.log.error({ err: e }, "start task failed");
      return reply.code(500).send({ error: "start_failed", message: String(e?.message ?? e) });
    }
  });

  app.post("/api/tasks/:taskId/cancel", async (req, reply) => {
    const taskId = (req.params as any).taskId as string;
    await orchestrator.cancelTask(taskId);
    return { ok: true };
  });

  app.post("/api/tasks/:taskId/ask-update", async (req, reply) => {
    const taskId = (req.params as any).taskId as string;
    try {
      await orchestrator.askUpdate(taskId);
      return { ok: true };
    } catch (e: any) {
      return reply.code(500).send({ error: "ask_update_failed", message: String(e?.message ?? e) });
    }
  });

  app.post("/api/tasks/:taskId/message", async (req, reply) => {
    const taskId = (req.params as any).taskId as string;
    const body = parseBody<any>(req.body);
    const text = String(body?.text ?? "");
    if (!text.trim()) return reply.code(400).send({ error: "missing_text" });
    try {
      await orchestrator.sendMessage(taskId, text);
      return { ok: true };
    } catch (e: any) {
      return reply.code(500).send({ error: "send_failed", message: String(e?.message ?? e) });
    }
  });

  app.post("/api/tasks/:taskId/status", async (req, reply) => {
    const taskId = (req.params as any).taskId as string;
    const body = parseBody<any>(req.body);
    const status = String(body?.status ?? "");
    const reason = String(body?.reason ?? "manual");
    try {
      setTaskStatus(db, taskId as any, status as any, reason);
      updateTask(db, taskId, {});
      return { ok: true };
    } catch (e: any) {
      return reply.code(500).send({ error: "status_failed", message: String(e?.message ?? e) });
    }
  });

  return app;
}
