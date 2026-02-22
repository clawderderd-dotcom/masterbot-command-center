import type { Db } from "./db.js";
import type { Run, RunStatus, Task, TaskPriority, TaskStatus } from "@mcc/shared";

function nowIso() {
  return new Date().toISOString();
}

function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function toTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    desiredOutcome: row.desiredOutcome,
    acceptanceCriteria: parseJsonArray(row.acceptanceCriteriaJson),
    suggestedPlan: parseJsonArray(row.suggestedPlanJson),
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    tags: parseJsonArray(row.tagsJson),
    dueAt: row.dueAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    assignedAgentId: row.assignedAgentId,
    sessionKey: row.sessionKey ?? null,
    lastTransitionReason: row.lastTransitionReason ?? null,
    lastTransitionAt: row.lastTransitionAt ?? null,
  };
}

function toRun(row: any): Run {
  return {
    id: row.id,
    taskId: row.taskId,
    number: row.number,
    status: row.status as RunStatus,
    startedAt: row.startedAt ?? null,
    endedAt: row.endedAt ?? null,
    outcome: row.outcome ?? null,
    error: row.error ?? null,
    gatewayRunId: row.gatewayRunId ?? null,
  };
}

export function listTasks(db: Db): Task[] {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY updatedAt DESC").all();
  return rows.map(toTask);
}

export function getTask(db: Db, id: string): Task | null {
  const row = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  return row ? toTask(row) : null;
}

export function createTask(
  db: Db,
  params: {
    id: string;
    title: string;
    description: string;
    desiredOutcome: string;
    acceptanceCriteria: string[];
    suggestedPlan: string[];
    priority: TaskPriority;
    tags: string[];
    dueAt: string | null;
    assignedAgentId: string;
  },
): Task {
  const ts = nowIso();
  db.prepare(
    `INSERT INTO tasks(
      id,title,description,desiredOutcome,acceptanceCriteriaJson,suggestedPlanJson,
      status,priority,tagsJson,dueAt,createdAt,updatedAt,assignedAgentId,sessionKey,lastTransitionReason,lastTransitionAt
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    params.id,
    params.title,
    params.description,
    params.desiredOutcome,
    JSON.stringify(params.acceptanceCriteria ?? []),
    JSON.stringify(params.suggestedPlan ?? []),
    "Draft",
    params.priority,
    JSON.stringify(params.tags ?? []),
    params.dueAt,
    ts,
    ts,
    params.assignedAgentId,
    null,
    "created",
    ts,
  );
  const t = getTask(db, params.id);
  if (!t) throw new Error("failed to create task");
  return t;
}

export function updateTask(db: Db, id: string, patch: Partial<Omit<Task, "id">>): Task {
  const prev = getTask(db, id);
  if (!prev) throw new Error("task not found");
  const next: Task = {
    ...prev,
    ...patch,
    acceptanceCriteria: patch.acceptanceCriteria ?? prev.acceptanceCriteria,
    suggestedPlan: patch.suggestedPlan ?? prev.suggestedPlan,
    tags: patch.tags ?? prev.tags,
    updatedAt: nowIso(),
  };

  db.prepare(
    `UPDATE tasks SET
      title=?, description=?, desiredOutcome=?,
      acceptanceCriteriaJson=?, suggestedPlanJson=?,
      status=?, priority=?, tagsJson=?, dueAt=?,
      updatedAt=?, assignedAgentId=?, sessionKey=?,
      lastTransitionReason=?, lastTransitionAt=?
     WHERE id=?`,
  ).run(
    next.title,
    next.description,
    next.desiredOutcome,
    JSON.stringify(next.acceptanceCriteria),
    JSON.stringify(next.suggestedPlan),
    next.status,
    next.priority,
    JSON.stringify(next.tags),
    next.dueAt,
    next.updatedAt,
    next.assignedAgentId,
    next.sessionKey,
    next.lastTransitionReason,
    next.lastTransitionAt,
    id,
  );

  const t = getTask(db, id);
  if (!t) throw new Error("failed to update task");
  return t;
}

export function setTaskStatus(
  db: Db,
  id: string,
  status: TaskStatus,
  reason: string,
): Task {
  return updateTask(db, id, {
    status,
    lastTransitionReason: reason,
    lastTransitionAt: nowIso(),
  });
}

export function listRuns(db: Db, taskId: string): Run[] {
  const rows = db.prepare("SELECT * FROM runs WHERE taskId=? ORDER BY number DESC").all(taskId);
  return rows.map(toRun);
}

export function createRun(db: Db, params: { id: string; taskId: string }): Run {
  const last = db.prepare("SELECT MAX(number) as n FROM runs WHERE taskId=?").get(params.taskId) as
    | { n: number | null }
    | undefined;
  const number = (last?.n ?? 0) + 1;
  db.prepare(
    `INSERT INTO runs(id, taskId, number, status, startedAt, endedAt, outcome, error, gatewayRunId)
     VALUES(?,?,?,?,?,?,?,?,?)`,
  ).run(params.id, params.taskId, number, "Queued", null, null, null, null, null);

  const row = db.prepare("SELECT * FROM runs WHERE id=?").get(params.id);
  if (!row) throw new Error("failed to create run");
  return toRun(row);
}

export function updateRun(db: Db, id: string, patch: Partial<Omit<Run, "id" | "taskId" | "number">>): Run {
  const prev = db.prepare("SELECT * FROM runs WHERE id=?").get(id);
  if (!prev) throw new Error("run not found");
  const next = { ...prev, ...patch };
  db.prepare(
    `UPDATE runs SET status=?, startedAt=?, endedAt=?, outcome=?, error=?, gatewayRunId=? WHERE id=?`,
  ).run(next.status, next.startedAt, next.endedAt, next.outcome, next.error, next.gatewayRunId, id);
  const row = db.prepare("SELECT * FROM runs WHERE id=?").get(id);
  if (!row) throw new Error("failed to update run");
  return toRun(row);
}

export function appendRunLog(
  db: Db,
  params: { taskId: string; runId: string; ts: string; level: "info" | "warn" | "error"; message: string },
) {
  db.prepare(
    `INSERT INTO run_logs(taskId, runId, ts, level, message) VALUES(?,?,?,?,?)`,
  ).run(params.taskId, params.runId, params.ts, params.level, params.message);
}

export function listRunLogs(db: Db, runId: string, limit = 400) {
  const rows = db
    .prepare("SELECT ts, level, message FROM run_logs WHERE runId=? ORDER BY id DESC LIMIT ?")
    .all(runId, limit) as { ts: string; level: string; message: string }[];
  return rows.reverse();
}
