export type TaskStatus =
  | "Draft"
  | "Queued"
  | "Running"
  | "Blocked"
  | "NeedsInput"
  | "Done"
  | "Cancelled"
  | "Archived";

export type TaskPriority = "Low" | "Normal" | "High" | "Urgent";

export type RunStatus = "Queued" | "Running" | "Done" | "Error" | "Cancelled";

export type Task = {
  id: string;
  title: string;
  description: string;
  desiredOutcome: string;
  acceptanceCriteria: string[];
  suggestedPlan: string[];
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAgentId: string; // default: "main"
  sessionKey: string | null;
  lastTransitionReason: string | null;
  lastTransitionAt: string | null;
};

export type Run = {
  id: string;
  taskId: string;
  number: number;
  status: RunStatus;
  startedAt: string | null;
  endedAt: string | null;
  outcome: string | null;
  error: string | null;
  gatewayRunId: string | null;
};

export type TaskEvent =
  | { type: "task.created"; taskId: string }
  | { type: "task.updated"; taskId: string }
  | { type: "task.status"; taskId: string; status: TaskStatus; reason: string }
  | { type: "run.created"; taskId: string; runId: string }
  | { type: "run.updated"; taskId: string; runId: string }
  | { type: "run.log"; taskId: string; runId: string; ts: string; level: "info" | "warn" | "error"; message: string }
  | { type: "gateway.connection"; connected: boolean; lastError?: string | null; hello?: unknown };

export type WsClientToServer =
  | { type: "subscribe"; taskId?: string }
  | { type: "unsubscribe"; taskId?: string }
  | { type: "gateway.connect" }
  | { type: "gateway.disconnect" }
  | { type: "task.start"; taskId: string }
  | { type: "task.cancel"; taskId: string }
  | { type: "task.askUpdate"; taskId: string }
  | { type: "task.sendMessage"; taskId: string; text: string };

export type WsServerToClient =
  | { type: "event"; event: TaskEvent }
  | { type: "error"; message: string };
